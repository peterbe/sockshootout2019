# XHR vs WebSockets 2019

Comparing the performance characteristics of using WebSockets instead of
XHR in 2019 to understand the pros and cons.

## How it works

You start a web (Python `tornado`) server that can accept XHR requests
and WebSocket messages. Each request/message is encoded with a `count`
and all the server needs to do is decrement this count.

On the client, it starts a timer and a self-recursive loop that simply
asks the server to decrement a number till it reaches 0. When it's done
we look at how long that took.

## To contribute

For the server, create a virtualenv (wanna contribute a `Dockerfile`?) and
install with:

    pip install -r requirements.txt

Start the server in debug mode with:

    python app.py --debug

Test that it works:

    curl -v http://localhost:8888/

Now start the front-end (which is `create-react-app`) like this:

    yarn
    yarn run start

Now open `http://localhost:3000` and follow the instructions there.

## How I tested this behind a local Nginx (on macOS)

First edit `/etc/hosts` so it contains this:

    ▶ cat /etc/hosts | grep sockshootout
    127.0.0.1       sockshootout.local
    ::1             sockshootout.local

Create a self-signed certificate with `mkcert` (from Homebrew):

    ▶ mkcert sockshootout.local
    Using the local CA at "/Users/peterbe/Library/Application
    Support/mkcert" ✨

    Created a new certificate valid for the following names 📜
     - "sockshootout.local"

    The certificate is at "./sockshootout.local.pem" and the key at
    "./sockshootout.local-key.pem" ✅

    ▶ ls *.pem
    sockshootout.local-key.pem sockshootout.local.pem

Next, create an Nginx config that looks something like this:

    server {
        server_name sockshootout.local;
        return 301 https://sockshootout.local$request_uri;
    }

    server {
        root /Users/peterbe/dev/TORNADO/sockshootout2019/build;
        server_name sockshootout.local;

        listen 443 ssl http2;

        # ssl on;
        ssl_certificate /Users/peterbe/dev/TORNADO/sockshootout2019/sockshootout.local.pem;
        ssl_certificate_key /Users/peterbe/dev/TORNADO/sockshootout2019/sockshootout.local-key.pem;
        ssl_session_timeout 1m;
        ssl_session_cache shared:SSL:50m;

        proxy_set_header Host $host;

        charset      utf-8;

        gzip_static on;

        location /ws {
            proxy_pass http://localhost:8888;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";
        }

        location / {
            try_files $uri @tornado;
        }
        location @tornado {
            proxy_set_header X-Forwarded-Proto https;
            proxy_set_header X-Forwarded-Host "";
            proxy_set_header Host $http_host;
            proxy_pass http://127.0.0.1:8888;
        }

        access_log  /tmp/sockshootout.access.log combined;
        error_log  /tmp/sockshootout.error.log info;
    }

## Note about running Tornado servers

The fastest thing is to fork out one process per CPU all running under
one port. This isn't ideal for production operations as
[described
here](https://www.tornadoweb.org/en/stable/guide/running.html#processes-and-ports)
and there are other better alternatives. But it is the best way to
squeeze out the best possible throughput when you don't have an
exernal load server in front of Tornado. You can start the app like
this:

    python app.py --logging=error --pre-fork

On my macbook that starts 8 processes and run:

    hey -n 10000 -c 100 "http://localhost:8888/xhr?count=1000"

    ...

    Requests/sec: 6216.8589

Without pre-fork, still with 100 clients doing 10,000 requests I get:

    Requests/sec: 1878.6060
