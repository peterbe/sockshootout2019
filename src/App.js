import React from "react";
import Sockette from "sockette";
import "./App.css";

const WS_URL =
  "ws" +
  (document.location.protocol === "https:" ? "s" : "") +
  "://" +
  document.location.host +
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
    this.setState({ runs, running: false }, this._persistRuns);
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
    this.setState({ runs, running: false }, this._persistRuns);
  };

  start = event => {
    event.preventDefault();
    this.setState({ running: true }, () => {
      if (this.state.test === "xhr") {
        this.startXHR(this.state.iterations);
      } else if (this.state.test === "ws") {
        this.startWS(this.state.iterations);
      }
    });
  };

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <p>WebSockets vs. XHR 2019</p>
        </header>
        <form onSubmit={this.start}>
          <div className="field is-horizontal">
            <label className="label">Iterations</label>
            <div className="control">
              <input
                type="number"
                className="input"
                name="iterations"
                value={this.state.iterations}
                onChange={e => {
                  try {
                    let iterations = parseInt(e.target.value, 10);
                    if (iterations > 1000) {
                      alert("Sorry. That's just too much");
                      iterations = 1000;
                    }
                    this.setState({ iterations });
                  } catch (ex) {
                    console.warn("Enter a number");
                    return;
                  }
                }}
              />
            </div>
          </div>

          <div className="field is-horizontal">
            <div className="field-label">
              <label className="label">Already a member?</label>
            </div>
            <div className="field-body">
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
                    />
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
                    />
                    WebSocket
                  </label>
                </div>
              </div>
            </div>
          </div>
          <p>
            <button
              className="button"
              disabled={this.state.running && !this.state.connected}
            >
              Start!
            </button>
            <br />
            {this.state.running ? <i>Running...</i> : null}
          </p>
          <hr />
          <Runs runs={this.state.runs} />
          <hr />
          <p>
            {this.state.connected ? (
              <b>WebSocket is connected</b>
            ) : (
              <i>
                WebSocket is <b>not</b> connected
              </i>
            )}
          </p>
        </form>
      </div>
    );
  }
}

export default App;

function Runs({ runs }) {
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
    </div>
  );
}
