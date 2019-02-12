import json

import tornado.ioloop
import tornado.web
import tornado.websocket
from tornado.options import define, options

# from decouple import config


define("port", default=8888, help="port to listen on")
define("debug", default=False, help="you know, when dev'ing")

# PORT = config("PORT", default=8888)
# DEBUG = config("DEBUG", default=False)


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
            self.write(data)


class WebSocketHandler(tornado.websocket.WebSocketHandler):
    def check_origin(self, origin):
        if options.debug:
            return True
        if origin in {"http://localhost:3000", "https://sockshootout.local"}:
            return True
        raise NotImplementedError(origin)

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


def make_app():
    return tornado.web.Application(
        [(r"/", MainHandler), (r"/xhr", XHRHandler), (r"/ws", WebSocketHandler)],
        debug=options.debug,
        autoreload=options.debug,
    )


if __name__ == "__main__":
    tornado.options.parse_command_line()
    app = make_app()
    app.listen(options.port)
    print("Starting on port", options.port, "in debug mode" if options.debug else "")
    tornado.ioloop.IOLoop.current().start()
