import os
from datetime import timedelta

import tornado.escape
import tornado.ioloop
import tornado.web
import tornado.websocket
import wsaccel
from tornado.options import define, options
from django.core.wsgi import get_wsgi_application

import ujson as json

wsaccel.patch_tornado()

define("port", default=8888, help="port to listen on")
define("debug", default=False, help="you know, when dev'ing")
define("pre_fork", default=False, help="forks one process per CPU")
define("allowed_origins", default="http://localhost:3000, https://sockshootout.local")


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "orm.settings")
_ = get_wsgi_application()

from orm.main.models import Submission, Run  # noqa


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("build/index.html")

    def post(self):
        runs = json.loads(self.get_argument("runs"))

        submission_id = self.get_argument("submission", None)
        if submission_id:
            submission = Submission.objects.get(uuid=submission_id)
            Run.objects.filter(submission=submission).delete()
            submission.save()  # updates 'modified'
        else:
            remote_ip = self.request.headers.get(
                "X-Forwarded-For",
                self.request.headers.get("X-Real-Ip", self.request.remote_ip),
            )
            user_agent = self.request.headers.get("User-Agent")
            submission = Submission.objects.create(
                user_agent=user_agent, ip_address=remote_ip
            )

        bulk = []
        assert isinstance(runs, list), type(runs)
        for run in runs:
            bulk.append(
                Run(
                    submission=submission,
                    test=run["test"],
                    iterations=run["iterations"],
                    time=timedelta(seconds=run["time"]),
                    speed=timedelta(seconds=run["time"] / run["iterations"]),
                )
            )
        Run.objects.bulk_create(bulk)
        self.write({"submission": str(submission.uuid)})


class XHRHandler(tornado.web.RequestHandler):
    def get(self):
        if self.get_argument("ping", None):
            self.write("pong")
        else:
            count = self.get_argument("count")
            data = {"count": int(count) - 1}
            self.write(json.dumps(data))


class WebSocketHandler(tornado.websocket.WebSocketHandler):
    def check_origin(self, origin):
        return origin in self.application.settings["allowed_origins"]

    # def open(self):
    #     self.connections.add(self)

    def on_message(self, message):
        if message == "ping":
            self.write_message("pong")
        else:
            data = json.loads(message)
            data["count"] -= 1
            self.write_message(data)

    # def on_close(self):
    #     self.connections.remove(self)


def make_app(allowed_origins):
    return tornado.web.Application(
        [(r"/", MainHandler), (r"/xhr", XHRHandler), (r"/ws", WebSocketHandler)],
        debug=options.debug,
        autoreload=options.debug,
        allowed_origins=allowed_origins,
    )


if __name__ == "__main__":
    tornado.options.parse_command_line()
    allowed_origins = set(
        [x.strip() for x in options.allowed_origins.split(",") if x.strip()]
    )
    app = make_app(allowed_origins=allowed_origins)
    if options.pre_fork:
        server = tornado.httpserver.HTTPServer(app)
        server.bind(options.port)
        server.start(0)  # forks one process per cpu
    else:
        app.listen(options.port)
    print(
        "Starting on port",
        options.port,
        "in",
        "debug" if options.debug else "production",
        "with allowed origins",
        allowed_origins,
    )
    tornado.ioloop.IOLoop.current().start()
