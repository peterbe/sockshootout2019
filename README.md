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
