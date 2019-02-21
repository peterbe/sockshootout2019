import React from "react";
import Sockette from "sockette";
import { BarChart, Bar, Legend } from "recharts";

import "./App.css";

const WS_URL =
  "ws" +
  (document.location.protocol === "https:" ? "s" : "") +
  "://" +
  document.location.host.replace(":3000", ":8888") +
  "/ws";

class App extends React.Component {
  state = {
    test: "xhr",
    iterations: 100,
    running: false,
    connected: false,
    runs: JSON.parse(sessionStorage.getItem("runs") || "[]"),
    submission: null,
    serverError: null
  };

  componentDidMount() {
    // console.log("WebSocket URL:", WS_URL);
    this.ws = new Sockette(WS_URL, {
      timeout: 5e3,
      maxAttempts: 10,
      onopen: e => {
        this.setState({ connected: true });
      },
      onmessage: e => {
        const data = JSON.parse(e.data);
        // console.log(data);
        if (data.count) {
          this.ws.json({ count: data.count });
        } else if (data.count !== undefined) {
          this.endWS();
        }
      },
      onreconnect: e => {
        console.log("Reconnecting...", e);
        this.setState({ connected: true });
      },
      onmaximum: e => {
        console.log("Stop Attempting!", e);
        this.setState({ connected: false });
      },
      onclose: e => {
        // console.log("Closed!", e);
        this.setState({ connected: false });
      },
      onerror: e => {
        console.log("Error:", e);
        // disconnected();
        this.setState({ connected: false });
      }
    });
  }

  changeTest = event => {
    this.setState({ test: event.currentTarget.value });
  };

  loopXHR = async count => {
    const res = await fetch(`/xhr?count=${count}`);
    const data = await res.json();
    const nextCount = data.count;
    if (nextCount) {
      this.loopXHR(nextCount);
    } else {
      this.endXHR();
    }
  };

  startXHR = iterations => {
    this.startIterations = iterations;
    this.startTimestamp = performance.now();
    this.loopXHR(iterations);
  };

  endXHR = () => {
    this.endTimestamp = performance.now();
    const runs = this.state.runs.slice(0);
    runs.push({
      time: this.endTimestamp - this.startTimestamp,
      iterations: this.startIterations,
      test: "xhr"
    });
    this.setState({ runs, running: null }, () => {
      this._persistRuns();
      if (this.state.test === "each") {
        this.setState({ running: "ws" }, () => {
          this.startWS(this.state.iterations);
        });
      }
    });
  };

  _persistRuns = () => {
    sessionStorage.setItem("runs", JSON.stringify(this.state.runs));
  };

  loopWS = async count => {
    const res = await fetch(`/xhr?count=${count}`);
    const data = await res.json();
    const nextCount = data.count;
    if (nextCount) {
      this.loopXHR(nextCount);
    } else {
      this.endXHR();
    }
  };

  startWS = iterations => {
    this.startIterations = iterations;
    this.startTimestamp = performance.now();
    this.ws.json({ count: iterations });
  };

  endWS = () => {
    this.endTimestamp = performance.now();
    const runs = this.state.runs.slice(0);
    runs.push({
      time: this.endTimestamp - this.startTimestamp,
      iterations: this.startIterations,
      test: "ws"
    });
    this.setState({ runs, running: null }, this._persistRuns);
  };

  start = event => {
    event.preventDefault();
    if (this.state.test === "xhr") {
      this.setState({ running: "xhr" }, () => {
        this.startXHR(this.state.iterations);
      });
    } else if (this.state.test === "ws") {
      this.setState({ running: "ws" }, () => {
        this.startWS(this.state.iterations);
      });
    } else if (this.state.test === "each") {
      this.setState({ running: "xhr" }, () => {
        this.startXHR(this.state.iterations);
      });
    } else {
      throw new Error(`${this.state.test} ??`);
    }
  };

  clearRuns = () => {
    this.setState({ runs: [] }, this._persistRuns);
  };

  shareRuns = async () => {
    const formData = new FormData();
    formData.append("runs", JSON.stringify(this.state.runs));
    if (this.state.submission) {
      formData.append("submission", this.state.submission);
    }
    let response;
    try {
      response = await fetch("/", {
        method: "POST",
        body: formData
      });
    } catch (ex) {
      console.warn(ex);
      return this.setState({ serverError: ex });
    }
    if (response.ok) {
      const data = await response.json();
      this.setState({ submission: data.submission });
    } else {
      this.setState({ serverError: response });
    }
  };

  render() {
    return (
      <section className="section">
        <div className="container">
          <h1 className="title">
            WebSockets vs. XHR <span style={{ color: "#666" }}>(2019)</span>
          </h1>

          <ShowServerError error={this.state.serverError} />

          <form onSubmit={this.start}>
            <div className="field is-horizontalxxx">
              <label className="label">Iterations</label>
              <div className="control">
                <input
                  type="number"
                  style={{ width: 150 }}
                  className="input"
                  name="iterations"
                  value={this.state.iterations || ""}
                  onChange={e => {
                    try {
                      let iterations = parseInt(e.target.value, 10);
                      if (!isNaN(iterations)) {
                        this.setState({ iterations }, () => {
                          if (this.state.iterations > 1000) {
                            alert("Sorry. That's just too much");
                            this.setState({ iterations: 1000 });
                          }
                        });
                      }
                    } catch (ex) {
                      console.warn("Enter a number");
                      return;
                    }
                  }}
                />{" "}
              </div>
            </div>

            <div className="field is-horizontalxxx">
              <div className="label">
                <label className="label">Type of test</label>
              </div>
              <div className="control">
                <div className="field is-narrow">
                  <div className="control">
                    <label className="radio">
                      <input
                        type="radio"
                        name="test"
                        value="xhr"
                        id="test_xhr"
                        checked={this.state.test === "xhr"}
                        onChange={this.changeTest}
                      />{" "}
                      XHR
                    </label>
                    <label className="radio">
                      <input
                        type="radio"
                        name="test"
                        value="ws"
                        id="test_ws"
                        checked={this.state.test === "ws"}
                        onChange={this.changeTest}
                      />{" "}
                      WebSocket
                    </label>
                    <label className="radio">
                      <input
                        type="radio"
                        name="test"
                        value="each"
                        checked={this.state.test === "each"}
                        onChange={this.changeTest}
                      />{" "}
                      One of each
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <p>
              <button
                className={
                  this.state.running
                    ? "button is-medium is-primary is-loading"
                    : "button is-medium is-primary"
                }
                disabled={this.state.running || !this.state.connected}
              >
                Start!
              </button>
              <br />
              {this.state.running ? (
                <i>
                  Running <b>{this.state.running}</b>...
                </i>
              ) : null}
            </p>
            <hr />
            <Runs
              runs={this.state.runs}
              clearRuns={this.clearRuns}
              shareRuns={this.shareRuns}
              submission={this.state.submission}
            />
            <hr />
            <Connected connected={this.state.connected} />
          </form>
        </div>
      </section>
    );
  }
}

export default App;

function ShowServerError({ error }) {
  if (!error) return null;
  return (
    <article className="message is-danger">
      <div className="message-header">Server Error</div>
      <div className="message-body">
        {error instanceof window.Response ? (
          <p>
            <b>{error.status}</b> on <b>{error.url}</b>
            <br />
            <small>{error.statusText}</small>
          </p>
        ) : (
          <p>
            <code>{error.toString()}</code>
          </p>
        )}
      </div>
    </article>
  );
}

const Connected = props => (
  <p>
    {props.connected ? (
      <b>WebSocket is connected</b>
    ) : (
      <i>
        WebSocket is <b>not</b> connected
      </i>
    )}
  </p>
);

const Runs = React.memo(({ runs, clearRuns, shareRuns, submission }) => {
  if (!runs.length) return null;

  const xhrRuns = runs
    .filter(r => r.test === "xhr")
    .map(r => r.iterations)
    .reduce((a, b) => a + b, 0);
  const wsRuns = runs
    .filter(r => r.test === "ws")
    .map(r => r.iterations)
    .reduce((a, b) => a + b, 0);
  const enoughRuns = wsRuns >= 300 && xhrRuns >= 300;

  return (
    <div>
      <h3 className="title is-3">Results</h3>
      <div className="columns">
        <div className="column">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Test</th>
                <th>Iterations</th>
                <th>Time</th>
                <th>"Speed"</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, i) => {
                return (
                  <tr key={i + run.test + run.iterations}>
                    <td>{i + 1}</td>
                    <td>{run.test}</td>
                    <td>{run.iterations.toLocaleString()}</td>
                    <td>{(run.time / 1000).toFixed(3)}s</td>
                    <td>
                      {(run.time / run.iterations).toFixed(2)} ms/iteration
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="column">
          <RunsBar runs={runs} />
        </div>
      </div>
      <p>
        <button type="button" className="button is-small" onClick={clearRuns}>
          Clear
        </button>
      </p>

      {enoughRuns ? (
        <p>
          <button
            type="button"
            className="button is-primary"
            onClick={shareRuns}
          >
            Share Your Results
          </button>
        </p>
      ) : (
        <p>
          <small>
            You need at least 300 <code>xhr</code> and 300{" "}
            <code>websocket</code> runs to submit.
          </small>
        </p>
      )}
      {submission && (
        <p>
          <b>Thanks for sharing!</b>
        </p>
      )}
    </div>
  );
});

function RunsBar({ runs }) {
  const speeds = {
    xhr: [],
    ws: []
  };
  runs.forEach(run => {
    speeds[run.test].push(run.time / run.iterations);
  });
  if (!speeds.xhr.length || !speeds.ws.length) return null;
  const means = {};
  Object.entries(speeds).forEach(([key, numbers]) => {
    means[key] = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  });
  const data = [means];
  return (
    <div>
      <h3 className="title is-3">Average "Speed" (smaller is better)</h3>
      <BarChart width={400} height={300} data={data}>
        <Bar dataKey="ws" name="WebSocket" fill="#8884d8" />
        <Bar dataKey="xhr" name="XHR" fill="#ff55ee" />
        <Legend />
      </BarChart>
    </div>
  );
}
