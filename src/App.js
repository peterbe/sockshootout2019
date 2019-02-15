import React from "react";
import Sockette from "sockette";
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
    runs: JSON.parse(sessionStorage.getItem("runs") || "[]")
  };

  componentDidMount() {
    console.log("WebSocket URL:", WS_URL);
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
    // this.setState({ running: true }, () => {
    //   if (this.state.test === "xhr") {
    //     this.startXHR(this.state.iterations);
    //   } else if (this.state.test === "ws") {
    //     this.startWS(this.state.iterations);
    //   } else if (this.state.test === "each") {
    //     this.startXHR(this.state.iterations);
    //   } else {
    //     throw new Error(`${this.state.test} ??`);
    //   }
    // });
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

  render() {
    return (
      <section className="section">
        <div className="container">
          <h1 className="title">WebSockets vs. XHR 2019</h1>
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
            <Runs runs={this.state.runs} clearRuns={this.clearRuns} />
            <hr />
            <Connected connected={this.state.connected} />
          </form>
        </div>
      </section>
    );
  }
}

export default App;

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

function Runs({ runs, clearRuns }) {
  if (!runs.length) return null;
  return (
    <div>
      <h3>Results</h3>
      <table className="table">
        <thead>
          <tr>
            <th colSpan={2}>Test</th>
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
                <td>{(run.time / run.iterations).toFixed(3)} ms/iteration</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button type="button" className="button" onClick={clearRuns}>
        Clear
      </button>
    </div>
  );
}
