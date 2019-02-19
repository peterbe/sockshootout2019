import ujson as json

import tornado.ioloop
import tornado.web
import tornado.websocket
from tornado.options import define, options
import wsaccel

wsaccel.patch_tornado()

define("port", default=8888, help="port to listen on")
define("debug", default=False, help="you know, when dev'ing")
define("pre_fork", default=False, help="forks one process per CPU")
define("allowed_origins", default="http://localhost:3000, https://sockshootout.local")


class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("build/index.html")


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
