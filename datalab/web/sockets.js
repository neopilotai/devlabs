"use strict";
/*
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketAdapter = exports.SocketIOAdapter = void 0;
exports.init = init;
exports.isSocketIoPath = isSocketIoPath;
var events_1 = require("events");
var SocketIo = require("socket.io");
var url = require("url");
// tslint:disable-next-line:enforce-name-casing
var WebSocket = require("ws");
var logging = require("./logging");
var sessionCounter = 0;
/**
 * The application settings instance.
 */
var appSettings;
/**
 * Creates a WebSocket connected to the Jupyter server for the URL in the
 * specified session.
 */
function createWebSocket(socketHost, port, session) {
    var path = url.parse(session.url).path;
    var socketUrl = "ws://".concat(socketHost, ":").concat(port).concat(path);
    logging.getLogger().debug('Creating WebSocket to %s for session %d', socketUrl, session.id);
    var ws = new WebSocket(socketUrl);
    ws.on('open', function () {
        // Stash the resulting WebSocket, now that it is in open state
        session.webSocket = ws;
        session.socket.emit('open', { url: session.url });
    })
        .on('close', function (code, reason) {
        // Remove the WebSocket from the session, once it is in closed state
        logging.getLogger().debug('WebSocket [%d] closed', session.id);
        session.webSocket = null;
        session.socket.emit('close', { url: session.url });
    })
        .on('message', function (data) {
        // Propagate messages arriving on the WebSocket to the client.
        if (data instanceof Buffer) {
            logging.getLogger().debug('WebSocket [%d] binary message length %d', session.id, data.length);
        }
        else {
            logging.getLogger().debug('WebSocket [%d] message\n%j', session.id, data);
        }
        session.socket.emit('data', { data: data });
    })
        // tslint:disable-next-line:no-any
        .on('error', function (e) {
        logging.getLogger().error('WebSocket [%d] error\n%j', session.id, e);
        if (e.code === 'ECONNREFUSED') {
            // This happens in the following situation -- old kernel that has gone
            // away likely due to a restart/shutdown... and an old notebook client
            // attempts to reconnect to the old kernel. That connection will be
            // refused. In this case, there is no point in keeping this socket.io
            // connection open.
            session.socket.disconnect(/* close */ true);
        }
    });
    return ws;
}
/**
 * Closes the WebSocket instance associated with the session.
 */
function closeWebSocket(session) {
    if (session.webSocket) {
        session.webSocket.close();
        session.webSocket = null;
    }
}
/**
 * Handles communication over the specified socket.
 */
function socketHandler(socket) {
    sessionCounter++;
    // Each socket is associated with a session that tracks the following:
    // - id: a counter for use in log output
    // - url: the url used to connect to the Jupyter server
    // - socket: the socket.io socket reference, which generates message
    //           events for anything sent by the browser client, and allows
    //           emitting messages to send to the browser
    // - webSocket: the corresponding WebSocket connection to the Jupyter
    //              server.
    // Within a session, messages recieved over the socket.io socket (from the
    // browser) are relayed to the WebSocket, and messages recieved over the
    // WebSocket socket are relayed back to the socket.io socket (to the browser).
    var session = { id: sessionCounter, url: '', socket: socket, webSocket: null };
    logging.getLogger().debug('Socket connected for session %d', session.id);
    socket.on('disconnect', function (reason) {
        logging.getLogger().debug('Socket disconnected for session %d reason: %s', session.id, reason);
        // Handle client disconnects to close WebSockets, so as to free up resources
        closeWebSocket(session);
    });
    socket.on('start', function (message) {
        logging.getLogger().debug('Start in session %d with url %s', session.id, message.url);
        try {
            var port = appSettings.nextJupyterPort;
            if (appSettings.kernelManagerProxyPort) {
                port = appSettings.kernelManagerProxyPort;
                logging.getLogger().debug('Using kernel manager proxy port %d', port);
            }
            var host = 'localhost';
            if (appSettings.kernelManagerProxyHost) {
                host = appSettings.kernelManagerProxyHost;
            }
            session.url = message.url;
            session.webSocket = createWebSocket(host, port, session);
            // tslint:disable-next-line:no-any
        }
        catch (e) {
            logging.getLogger().error(e, 'Unable to create WebSocket connection to %s', message.url);
            session.socket.disconnect(/* close */ true);
        }
    });
    socket.on('stop', function (message) {
        logging.getLogger().debug('Stop in session %d with url %s', session.id, message.url);
        closeWebSocket(session);
    });
    socket.on('data', function (message) {
        // Propagate the message over to the WebSocket.
        if (session.webSocket) {
            if (message instanceof Buffer) {
                logging.getLogger().debug('Send binary data of length %d in session %d.', message.length, session.id);
                session.webSocket.send(message, function (e) {
                    if (e) {
                        logging.getLogger().error(e, 'Failed to send message to websocket');
                    }
                });
            }
            else {
                logging.getLogger().debug('Send data in session %d\n%s', session.id, message.data);
                session.webSocket.send(message.data, function (e) {
                    if (e) {
                        logging.getLogger().error(e, 'Failed to send message to websocket');
                    }
                });
            }
        }
        else {
            logging.getLogger().error('Unable to send message; WebSocket is not open');
        }
    });
}
/** Initialize the socketio handler. */
function init(server, settings) {
    appSettings = settings;
    var io = SocketIo(server, {
        path: '/socket.io',
        transports: ['polling'],
        allowUpgrades: false,
        // v2.10 changed default from 60s to 5s, prefer the longer timeout to
        // avoid errant disconnects.
        pingTimeout: 60000,
    });
    io.of('/session').on('connection', socketHandler);
    return io;
}
/** Return true iff path is handled by socket.io. */
function isSocketIoPath(path) {
    return path.indexOf('/socket.io/') === 0;
}
/** A base class for socket classes adapting to the Socket interface. */
var Adapter = /** @class */ (function () {
    function Adapter() {
        this.emitter = new events_1.EventEmitter();
    }
    Adapter.prototype.onClose = function (listener) {
        this.emitter.on('close', listener);
    };
    Adapter.prototype.onStringMessage = function (listener) {
        this.emitter.on('string_message', listener);
    };
    Adapter.prototype.onBinaryMessage = function (listener) {
        this.emitter.on('binary_message', listener);
    };
    return Adapter;
}());
/** A socket adapter for socket.io.  */
var SocketIOAdapter = /** @class */ (function (_super) {
    __extends(SocketIOAdapter, _super);
    function SocketIOAdapter(socket) {
        var _this = _super.call(this) || this;
        _this.socket = socket;
        _this.socket.on('error', function (err) {
            logging.getLogger().error("error on socket.io: ".concat(err));
            // Event unsupported in Socket.
        });
        _this.socket.on('disconnecting', function () {
            logging.getLogger().error("disconnecting socket.io");
            // Event unsupported in Socket.
        });
        _this.socket.on('disconnect', function (reason) {
            _this.emitter.emit('close', reason);
        });
        _this.socket.on('data', function (event) {
            if (event instanceof Buffer) {
                _this.emitter.emit('binary_message', event);
            }
            else if (event.hasOwnProperty('data')) {
                var dataMessage = event;
                if (typeof dataMessage.data === 'string') {
                    _this.emitter.emit('string_message', dataMessage.data);
                }
                else if (dataMessage.data instanceof Buffer) {
                    _this.emitter.emit('binary_message', dataMessage.data);
                }
                else if (dataMessage.data instanceof ArrayBuffer) {
                    _this.emitter.emit('binary_message', Buffer.from(dataMessage.data));
                }
            }
        });
        return _this;
    }
    SocketIOAdapter.prototype.sendString = function (data) {
        this.socket.emit('data', { data: data });
    };
    SocketIOAdapter.prototype.sendBinary = function (data) {
        this.socket.emit('data', { data: data });
    };
    SocketIOAdapter.prototype.close = function (keepTransportOpen) {
        this.socket.disconnect(!keepTransportOpen);
    };
    return SocketIOAdapter;
}(Adapter));
exports.SocketIOAdapter = SocketIOAdapter;
/** A socket adapter for websockets.  */
var WebSocketAdapter = /** @class */ (function (_super) {
    __extends(WebSocketAdapter, _super);
    function WebSocketAdapter(ws) {
        var _this = _super.call(this) || this;
        _this.ws = ws;
        _this.ws.on('error', function (err) {
            logging.getLogger().error("websocket error: ".concat(err));
        });
        _this.ws.on('disconnecting', function () {
            logging.getLogger().error("disconnecting websocket");
            // Event unsupported in Socket.
        });
        _this.ws.on('close', function (code, reason) {
            _this.emitter.emit('close', "code:".concat(code, " reason:").concat(reason));
        });
        _this.ws.on('message', function (data) {
            if (typeof data === 'string') {
                _this.emitter.emit('string_message', data);
            }
            else {
                _this.emitter.emit('binary_message', data);
            }
        });
        return _this;
    }
    WebSocketAdapter.prototype.sendString = function (data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        }
    };
    WebSocketAdapter.prototype.sendBinary = function (data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data);
        }
    };
    // tslint:disable-next-line:no-unused-variable
    WebSocketAdapter.prototype.close = function (keepTransportOpen) {
        this.ws.close();
    };
    return WebSocketAdapter;
}(Adapter));
exports.WebSocketAdapter = WebSocketAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RoaXJkX3BhcnR5L2NvbGFiL3NvdXJjZXMvc29ja2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7O0dBY0c7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTZMSCxvQkFjQztBQUdELHdDQUVDO0FBOU1ELGlDQUFvQztBQUVwQyxvQ0FBc0M7QUFFdEMseUJBQTJCO0FBQzNCLCtDQUErQztBQUMvQyw4QkFBZ0M7QUFHaEMsbUNBQXFDO0FBaUJyQyxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUM7QUFFdkI7O0dBRUc7QUFDSCxJQUFJLFdBQXdCLENBQUM7QUFFN0I7OztHQUdHO0FBQ0gsU0FBUyxlQUFlLENBQ3BCLFVBQWtCLEVBQUUsSUFBWSxFQUFFLE9BQWdCO0lBQ3BELElBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUN6QyxJQUFNLFNBQVMsR0FBRyxlQUFRLFVBQVUsY0FBSSxJQUFJLFNBQUcsSUFBSSxDQUFFLENBQUM7SUFDdEQsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLEtBQUssQ0FDckIseUNBQXlDLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUV0RSxJQUFNLEVBQUUsR0FBRyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFDTjtRQUNFLDhEQUE4RDtRQUM5RCxPQUFPLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUN2QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDO1NBQ0gsRUFBRSxDQUFDLE9BQU8sRUFD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SSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsS0FBSyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckIsQ0FBQztJQUNILENBQUM7SUFFRCw4Q0FBOEM7SUFDOUMsZ0NBQUssR0FBTCxVQUFNLGlCQUEwQjtRQUM5QixJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFDSCx1QkFBQztBQUFELENBQUMsQUF6Q0QsQ0FBc0MsT0FBTyxHQXlDNUM7QUF6Q1ksNENBQWdCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3RcbiAqIHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mXG4gKiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVFxuICogV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlXG4gKiBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9ucyB1bmRlclxuICogdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IHtFdmVudEVtaXR0ZXJ9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgU29ja2V0SW8gZnJvbSAnc29ja2V0LmlvJztcbmltcG9ydCB7U2VydmVyIGFzIFNvY2tldElvU2VydmVyLCBTb2NrZXR9IGZyb20gJ3NvY2tldC5pbyc7XG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTplbmZvcmNlLW5hbWUtY2FzaW5nXG5pbXBvcnQgKiBhcyBXZWJTb2NrZXQgZnJvbSAnd3MnO1xuXG5pbXBvcnQge0FwcFNldHRpbmdzfSBmcm9tICcuL2FwcFNldHRpbmdzJztcbmltcG9ydCAqIGFzIGxvZ2dpbmcgZnJvbSAnLi9sb2dnaW5nJztcblxuaW50ZXJmYWNlIFNlc3Npb24ge1xuICBpZDogbnVtYmVyO1xuICB1cmw6IHN0cmluZztcbiAgc29ja2V0OiBTb2NrZXQ7XG4gIHdlYlNvY2tldDogV2ViU29ja2V0fG51bGw7XG59XG5cbmludGVyZmFjZSBTZXNzaW9uTWVzc2FnZSB7XG4gIHVybDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgRGF0YU1lc3NhZ2Uge1xuICBkYXRhOiBzdHJpbmd8QnVmZmVyfEFycmF5QnVmZmVyO1xufVxuXG5sZXQgc2Vzc2lvbkNvdW50ZXIgPSAwO1xuXG4vKipcbiAqIFRoZSBhcHBsaWNhdGlvbiBzZXR0aW5ncyBpbnN0YW5jZS5cbiAqL1xubGV0IGFwcFNldHRpbmdzOiBBcHBTZXR0aW5ncztcblxuLyoqXG4gKiBDcmVhdGVzIGEgV2ViU29ja2V0IGNvbm5lY3RlZCB0byB0aGUgSnVweXRlciBzZXJ2ZXIgZm9yIHRoZSBVUkwgaW4gdGhlXG4gKiBzcGVjaWZpZWQgc2Vzc2lvbi5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlV2ViU29ja2V0KFxuICAgIHNvY2tldEhvc3Q6IHN0cmluZywgcG9ydDogbnVtYmVyLCBzZXNzaW9uOiBTZXNzaW9uKTogV2ViU29ja2V0IHtcbiAgY29uc3QgcGF0aCA9IHVybC5wYXJzZShzZXNzaW9uLnVybCkucGF0aDtcbiAgY29uc3Qgc29ja2V0VXJsID0gYHdzOi8vJHtzb2NrZXRIb3N0fToke3BvcnR9JHtwYXRofWA7XG4gIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuZGVidWcoXG4gICAgICAnQ3JlYXRpbmcgV2ViU29ja2V0IHRvICVzIGZvciBzZXNzaW9uICVkJywgc29ja2V0VXJsLCBzZXNzaW9uLmlkKTtcblxuICBjb25zdCB3cyA9IG5ldyBXZWJTb2NrZXQoc29ja2V0VXJsKTtcbiAgd3Mub24oJ29wZW4nLFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgLy8gU3Rhc2ggdGhlIHJlc3VsdGluZyBXZWJTb2NrZXQsIG5vdyB0aGF0IGl0IGlzIGluIG9wZW4gc3RhdGVcbiAgICAgICAgICBzZXNzaW9uLndlYlNvY2tldCA9IHdzO1xuICAgICAgICAgIHNlc3Npb24uc29ja2V0LmVtaXQoJ29wZW4nLCB7dXJsOiBzZXNzaW9uLnVybH0pO1xuICAgICAgICB9KVxuICAgICAgLm9uKCdjbG9zZScsXG4gICAgICAgICAgKGNvZGU6IG51bWJlciwgcmVhc29uOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgV2ViU29ja2V0IGZyb20gdGhlIHNlc3Npb24sIG9uY2UgaXQgaXMgaW4gY2xvc2VkIHN0YXRlXG4gICAgICAgICAgICBsb2dnaW5nLmdldExvZ2dlcigpLmRlYnVnKCdXZWJTb2NrZXQgWyVkXSBjbG9zZWQnLCBzZXNzaW9uLmlkKTtcbiAgICAgICAgICAgIHNlc3Npb24ud2ViU29ja2V0ID0gbnVsbDtcbiAgICAgICAgICAgIHNlc3Npb24uc29ja2V0LmVtaXQoJ2Nsb3NlJywge3VybDogc2Vzc2lvbi51cmx9KTtcbiAgICAgICAgICB9KVxuICAgICAgLm9uKCdtZXNzYWdlJyxcbiAgICAgICAgICAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgLy8gUHJvcGFnYXRlIG1lc3NhZ2VzIGFycml2aW5nIG9uIHRoZSBXZWJTb2NrZXQgdG8gdGhlIGNsaWVudC5cbiAgICAgICAgICAgIGlmIChkYXRhIGluc3RhbmNlb2YgQnVmZmVyKSB7XG4gICAgICAgICAgICAgIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuZGVidWcoXG4gICAgICAgICAgICAgICAgICAnV2ViU29ja2V0IFslZF0gYmluYXJ5IG1lc3NhZ2UgbGVuZ3RoICVkJywgc2Vzc2lvbi5pZCxcbiAgICAgICAgICAgICAgICAgIGRhdGEubGVuZ3RoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuZGVidWcoXG4gICAgICAgICAgICAgICAgICAnV2ViU29ja2V0IFslZF0gbWVzc2FnZVxcbiVqJywgc2Vzc2lvbi5pZCwgZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXNzaW9uLnNvY2tldC5lbWl0KCdkYXRhJywge2RhdGF9KTtcbiAgICAgICAgICB9KVxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgLm9uKCdlcnJvcicsIChlOiBhbnkpID0+IHtcbiAgICAgICAgbG9nZ2luZy5nZXRMb2dnZXIoKS5lcnJvcignV2ViU29ja2V0IFslZF0gZXJyb3JcXG4laicsIHNlc3Npb24uaWQsIGUpO1xuICAgICAgICBpZiAoZS5jb2RlID09PSAnRUNPTk5SRUZVU0VEJykge1xuICAgICAgICAgIC8vIFRoaXMgaGFwcGVucyBpbiB0aGUgZm9sbG93aW5nIHNpdHVhdGlvbiAtLSBvbGQga2VybmVsIHRoYXQgaGFzIGdvbmVcbiAgICAgICAgICAvLyBhd2F5IGxpa2VseSBkdWUgdG8gYSByZXN0YXJ0L3NodXRkb3duLi4uIGFuZCBhbiBvbGQgbm90ZWJvb2sgY2xpZW50XG4gICAgICAgICAgLy8gYXR0ZW1wdHMgdG8gcmVjb25uZWN0IHRvIHRoZSBvbGQga2VybmVsLiBUaGF0IGNvbm5lY3Rpb24gd2lsbCBiZVxuICAgICAgICAgIC8vIHJlZnVzZWQuIEluIHRoaXMgY2FzZSwgdGhlcmUgaXMgbm8gcG9pbnQgaW4ga2VlcGluZyB0aGlzIHNvY2tldC5pb1xuICAgICAgICAgIC8vIGNvbm5lY3Rpb24gb3Blbi5cbiAgICAgICAgICBzZXNzaW9uLnNvY2tldC5kaXNjb25uZWN0KC8qIGNsb3NlICovIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICByZXR1cm4gd3M7XG59XG5cbi8qKlxuICogQ2xvc2VzIHRoZSBXZWJTb2NrZXQgaW5zdGFuY2UgYXNzb2NpYXRlZCB3aXRoIHRoZSBzZXNzaW9uLlxuICovXG5mdW5jdGlvbiBjbG9zZVdlYlNvY2tldChzZXNzaW9uOiBTZXNzaW9uKTogdm9pZCB7XG4gIGlmIChzZXNzaW9uLndlYlNvY2tldCkge1xuICAgIHNlc3Npb24ud2ViU29ja2V0LmNsb3NlKCk7XG4gICAgc2Vzc2lvbi53ZWJTb2NrZXQgPSBudWxsO1xuICB9XG59XG5cbi8qKlxuICogSGFuZGxlcyBjb21tdW5pY2F0aW9uIG92ZXIgdGhlIHNwZWNpZmllZCBzb2NrZXQuXG4gKi9cbmZ1bmN0aW9uIHNvY2tldEhhbmRsZXIoc29ja2V0OiBTb2NrZXQpIHtcbiAgc2Vzc2lvbkNvdW50ZXIrKztcblxuICAvLyBFYWNoIHNvY2tldCBpcyBhc3NvY2lhdGVkIHdpdGggYSBzZXNzaW9uIHRoYXQgdHJhY2tzIHRoZSBmb2xsb3dpbmc6XG4gIC8vIC0gaWQ6IGEgY291bnRlciBmb3IgdXNlIGluIGxvZyBvdXRwdXRcbiAgLy8gLSB1cmw6IHRoZSB1cmwgdXNlZCB0byBjb25uZWN0IHRvIHRoZSBKdXB5dGVyIHNlcnZlclxuICAvLyAtIHNvY2tldDogdGhlIHNvY2tldC5pbyBzb2NrZXQgcmVmZXJlbmNlLCB3aGljaCBnZW5lcmF0ZXMgbWVzc2FnZVxuICAvLyAgICAgICAgICAgZXZlbnRzIGZvciBhbnl0aGluZyBzZW50IGJ5IHRoZSBicm93c2VyIGNsaWVudCwgYW5kIGFsbG93c1xuICAvLyAgICAgICAgICAgZW1pdHRpbmcgbWVzc2FnZXMgdG8gc2VuZCB0byB0aGUgYnJvd3NlclxuICAvLyAtIHdlYlNvY2tldDogdGhlIGNvcnJlc3BvbmRpbmcgV2ViU29ja2V0IGNvbm5lY3Rpb24gdG8gdGhlIEp1cHl0ZXJcbiAgLy8gICAgICAgICAgICAgIHNlcnZlci5cbiAgLy8gV2l0aGluIGEgc2Vzc2lvbiwgbWVzc2FnZXMgcmVjaWV2ZWQgb3ZlciB0aGUgc29ja2V0LmlvIHNvY2tldCAoZnJvbSB0aGVcbiAgLy8gYnJvd3NlcikgYXJlIHJlbGF5ZWQgdG8gdGhlIFdlYlNvY2tldCwgYW5kIG1lc3NhZ2VzIHJlY2lldmVkIG92ZXIgdGhlXG4gIC8vIFdlYlNvY2tldCBzb2NrZXQgYXJlIHJlbGF5ZWQgYmFjayB0byB0aGUgc29ja2V0LmlvIHNvY2tldCAodG8gdGhlIGJyb3dzZXIpLlxuICBjb25zdCBzZXNzaW9uOlxuICAgICAgU2Vzc2lvbiA9IHtpZDogc2Vzc2lvbkNvdW50ZXIsIHVybDogJycsIHNvY2tldCwgd2ViU29ja2V0OiBudWxsfTtcblxuICBsb2dnaW5nLmdldExvZ2dlcigpLmRlYnVnKCdTb2NrZXQgY29ubmVjdGVkIGZvciBzZXNzaW9uICVkJywgc2Vzc2lvbi5pZCk7XG5cbiAgc29ja2V0Lm9uKCdkaXNjb25uZWN0JywgKHJlYXNvbjogc3RyaW5nKSA9PiB7XG4gICAgbG9nZ2luZy5nZXRMb2dnZXIoKS5kZWJ1ZyhcbiAgICAgICAgJ1NvY2tldCBkaXNjb25uZWN0ZWQgZm9yIHNlc3Npb24gJWQgcmVhc29uOiAlcycsIHNlc3Npb24uaWQsIHJlYXNvbik7XG5cbiAgICAvLyBIYW5kbGUgY2xpZW50IGRpc2Nvbm5lY3RzIHRvIGNsb3NlIFdlYlNvY2tldHMsIHNvIGFzIHRvIGZyZWUgdXAgcmVzb3VyY2VzXG4gICAgY2xvc2VXZWJTb2NrZXQoc2Vzc2lvbik7XG4gIH0pO1xuXG4gIHNvY2tldC5vbignc3RhcnQnLCAobWVzc2FnZTogU2Vzc2lvbk1lc3NhZ2UpID0+IHtcbiAgICBsb2dnaW5nLmdldExvZ2dlcigpLmRlYnVnKFxuICAgICAgICAnU3RhcnQgaW4gc2Vzc2lvbiAlZCB3aXRoIHVybCAlcycsIHNlc3Npb24uaWQsIG1lc3NhZ2UudXJsKTtcblxuICAgIHRyeSB7XG4gICAgICBsZXQgcG9ydCA9IGFwcFNldHRpbmdzLm5leHRKdXB5dGVyUG9ydDtcbiAgICAgIGlmIChhcHBTZXR0aW5ncy5rZXJuZWxNYW5hZ2VyUHJveHlQb3J0KSB7XG4gICAgICAgIHBvcnQgPSBhcHBTZXR0aW5ncy5rZXJuZWxNYW5hZ2VyUHJveHlQb3J0O1xuICAgICAgICBsb2dnaW5nLmdldExvZ2dlcigpLmRlYnVnKCdVc2luZyBrZXJuZWwgbWFuYWdlciBwcm94eSBwb3J0ICVkJywgcG9ydCk7XG4gICAgICB9XG4gICAgICBsZXQgaG9zdCA9ICdsb2NhbGhvc3QnO1xuICAgICAgaWYgKGFwcFNldHRpbmdzLmtlcm5lbE1hbmFnZXJQcm94eUhvc3QpIHtcbiAgICAgICAgaG9zdCA9IGFwcFNldHRpbmdzLmtlcm5lbE1hbmFnZXJQcm94eUhvc3Q7XG4gICAgICB9XG4gICAgICBzZXNzaW9uLnVybCA9IG1lc3NhZ2UudXJsO1xuICAgICAgc2Vzc2lvbi53ZWJTb2NrZXQgPSBjcmVhdGVXZWJTb2NrZXQoaG9zdCwgcG9ydCwgc2Vzc2lvbik7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICBsb2dnaW5nLmdldExvZ2dlcigpLmVycm9yKFxuICAgICAgICAgIGUsICdVbmFibGUgdG8gY3JlYXRlIFdlYlNvY2tldCBjb25uZWN0aW9uIHRvICVzJywgbWVzc2FnZS51cmwpO1xuICAgICAgc2Vzc2lvbi5zb2NrZXQuZGlzY29ubmVjdCgvKiBjbG9zZSAqLyB0cnVlKTtcbiAgICB9XG4gIH0pO1xuXG4gIHNvY2tldC5vbignc3RvcCcsIChtZXNzYWdlOiBTZXNzaW9uTWVzc2FnZSkgPT4ge1xuICAgIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuZGVidWcoXG4gICAgICAgICdTdG9wIGluIHNlc3Npb24gJWQgd2l0aCB1cmwgJXMnLCBzZXNzaW9uLmlkLCBtZXNzYWdlLnVybCk7XG5cbiAgICBjbG9zZVdlYlNvY2tldChzZXNzaW9uKTtcbiAgfSk7XG5cbiAgc29ja2V0Lm9uKCdkYXRhJywgKG1lc3NhZ2U6IERhdGFNZXNzYWdlKSA9PiB7XG4gICAgLy8gUHJvcGFnYXRlIHRoZSBtZXNzYWdlIG92ZXIgdG8gdGhlIFdlYlNvY2tldC5cbiAgICBpZiAoc2Vzc2lvbi53ZWJTb2NrZXQpIHtcbiAgICAgIGlmIChtZXNzYWdlIGluc3RhbmNlb2YgQnVmZmVyKSB7XG4gICAgICAgIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuZGVidWcoXG4gICAgICAgICAgICAnU2VuZCBiaW5hcnkgZGF0YSBvZiBsZW5ndGggJWQgaW4gc2Vzc2lvbiAlZC4nLCBtZXNzYWdlLmxlbmd0aCxcbiAgICAgICAgICAgIHNlc3Npb24uaWQpO1xuICAgICAgICBzZXNzaW9uLndlYlNvY2tldC5zZW5kKG1lc3NhZ2UsIChlOiBFcnJvcikgPT4ge1xuICAgICAgICAgIGlmIChlKSB7XG4gICAgICAgICAgICBsb2dnaW5nLmdldExvZ2dlcigpLmVycm9yKGUsICdGYWlsZWQgdG8gc2VuZCBtZXNzYWdlIHRvIHdlYnNvY2tldCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2dnaW5nLmdldExvZ2dlcigpLmRlYnVnKFxuICAgICAgICAgICAgJ1NlbmQgZGF0YSBpbiBzZXNzaW9uICVkXFxuJXMnLCBzZXNzaW9uLmlkLCBtZXNzYWdlLmRhdGEpO1xuICAgICAgICBzZXNzaW9uLndlYlNvY2tldC5zZW5kKG1lc3NhZ2UuZGF0YSwgKGU6IEVycm9yKSA9PiB7XG4gICAgICAgICAgaWYgKGUpIHtcbiAgICAgICAgICAgIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuZXJyb3IoZSwgJ0ZhaWxlZCB0byBzZW5kIG1lc3NhZ2UgdG8gd2Vic29ja2V0Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nZ2luZy5nZXRMb2dnZXIoKS5lcnJvcihcbiAgICAgICAgICAnVW5hYmxlIHRvIHNlbmQgbWVzc2FnZTsgV2ViU29ja2V0IGlzIG5vdCBvcGVuJyk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqIEluaXRpYWxpemUgdGhlIHNvY2tldGlvIGhhbmRsZXIuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdChcbiAgICBzZXJ2ZXI6IGh0dHAuU2VydmVyLCBzZXR0aW5nczogQXBwU2V0dGluZ3MpOiBTb2NrZXRJb1NlcnZlciB7XG4gIGFwcFNldHRpbmdzID0gc2V0dGluZ3M7XG4gIGNvbnN0IGlvID0gU29ja2V0SW8oc2VydmVyLCB7XG4gICAgcGF0aDogJy9zb2NrZXQuaW8nLFxuICAgIHRyYW5zcG9ydHM6IFsncG9sbGluZyddLFxuICAgIGFsbG93VXBncmFkZXM6IGZhbHNlLFxuICAgIC8vIHYyLjEwIGNoYW5nZWQgZGVmYXVsdCBmcm9tIDYwcyB0byA1cywgcHJlZmVyIHRoZSBsb25nZXIgdGltZW91dCB0b1xuICAgIC8vIGF2b2lkIGVycmFudCBkaXNjb25uZWN0cy5cbiAgICBwaW5nVGltZW91dDogNjAwMDAsXG4gIH0pO1xuXG4gIGlvLm9mKCcvc2Vzc2lvbicpLm9uKCdjb25uZWN0aW9uJywgc29ja2V0SGFuZGxlcik7XG4gIHJldHVybiBpbztcbn1cblxuLyoqIFJldHVybiB0cnVlIGlmZiBwYXRoIGlzIGhhbmRsZWQgYnkgc29ja2V0LmlvLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU29ja2V0SW9QYXRoKHBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gcGF0aC5pbmRleE9mKCcvc29ja2V0LmlvLycpID09PSAwO1xufVxuXG5cbi8qKlxuICogQSBzaW1wbGUgc29ja2V0IGFic3RyYWN0aW9uIHRvIHN1cHBvcnQgdHJhbnNpdGlvbmluZyBmcm9tIHNvY2tldC5pbyB0b1xuICogd2Vic29ja2V0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEFic3RyYWN0U29ja2V0IHtcbiAgLyoqIFNlbmQgc3RyaW5nIGRhdGEuIFNpbGVudGx5IGRyb3BzIG1lc3NhZ2VzIGlmIG5vdCBjb25uZWN0ZWQuICovXG4gIHNlbmRTdHJpbmcoZGF0YTogc3RyaW5nKTogdm9pZDtcblxuICAvKiogU2VuZCBiaW5hcnkgZGF0YS4gU2lsZW50bHkgZHJvcHMgbWVzc2FnZXMgaWYgbm90IGNvbm5lY3RlZC4gKi9cbiAgc2VuZEJpbmFyeShkYXRhOiBBcnJheUJ1ZmZlcik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIENsb3NlIHRoZSBzb2NrZXQuXG4gICAqXG4gICAqIEBwYXJhbSBrZWVwVHJhbnNwb3J0T3BlbjogV2hlbiB0cnVlIGFuZCB0aGUgdW5kZXJseWluZyB0cmFuc3BvcnQgc3VwcG9ydHNcbiAgICogbXVsdGlwbGV4aW5nIHNvY2tldCBjb25uZWN0aW9ucywga2VlcCB0aGF0IHRyYW5zcG9ydCBvcGVuLlxuICAgKlxuICAgKi9cbiAgY2xvc2Uoa2VlcFRyYW5zcG9ydE9wZW46IGJvb2xlYW4pOiB2b2lkO1xuXG4gIC8qKiBMaXN0ZW4gZm9yIHNvY2tldCBjbG9zZSBldmVudHMuICovXG4gIG9uQ2xvc2UobGlzdGVuZXI6IChyZWFzb246IHN0cmluZykgPT4gdm9pZCk6IHZvaWQ7XG5cbiAgLyoqIExpc3RlbiBmb3Igc3RyaW5nIHR5cGUgZGF0YSByZWNlaXZlZCBldmVudHMuICovXG4gIG9uU3RyaW5nTWVzc2FnZShsaXN0ZW5lcjogKGRhdGE6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQ7XG5cbiAgLyoqIExpc3RlbiBmb3IgYmluYXJ5IHR5cGUgZGF0YSByZWNlaXZlZCBldmVudHMuICovXG4gIG9uQmluYXJ5TWVzc2FnZShsaXN0ZW5lcjogKGRhdGE6IEJ1ZmZlcikgPT4gdm9pZCk6IHZvaWQ7XG59XG5cblxuLyoqIEEgYmFzZSBjbGFzcyBmb3Igc29ja2V0IGNsYXNzZXMgYWRhcHRpbmcgdG8gdGhlIFNvY2tldCBpbnRlcmZhY2UuICovXG5hYnN0cmFjdCBjbGFzcyBBZGFwdGVyIGltcGxlbWVudHMgQWJzdHJhY3RTb2NrZXQge1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICBhYnN0cmFjdCBzZW5kU3RyaW5nKGRhdGE6IHN0cmluZyk6IHZvaWQ7XG5cbiAgYWJzdHJhY3Qgc2VuZEJpbmFyeShkYXRhOiBBcnJheUJ1ZmZlcik6IHZvaWQ7XG5cbiAgYWJzdHJhY3QgY2xvc2Uoa2VlcFRyYW5zcG9ydE9wZW46IGJvb2xlYW4pOiB2b2lkO1xuXG4gIG9uQ2xvc2UobGlzdGVuZXI6IChyZWFzb246IHN0cmluZykgPT4gdm9pZCkge1xuICAgIHRoaXMuZW1pdHRlci5vbignY2xvc2UnLCBsaXN0ZW5lcik7XG4gIH1cblxuICBvblN0cmluZ01lc3NhZ2UobGlzdGVuZXI6IChkYXRhOiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgICB0aGlzLmVtaXR0ZXIub24oJ3N0cmluZ19tZXNzYWdlJywgbGlzdGVuZXIpO1xuICB9XG5cbiAgb25CaW5hcnlNZXNzYWdlKGxpc3RlbmVyOiAoZGF0YTogQnVmZmVyKSA9PiB2b2lkKSB7XG4gICAgdGhpcy5lbWl0dGVyLm9uKCdiaW5hcnlfbWVzc2FnZScsIGxpc3RlbmVyKTtcbiAgfVxufVxuXG5cbi8qKiBBIHNvY2tldCBhZGFwdGVyIGZvciBzb2NrZXQuaW8uICAqL1xuZXhwb3J0IGNsYXNzIFNvY2tldElPQWRhcHRlciBleHRlbmRzIEFkYXB0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHNvY2tldDogU29ja2V0KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLnNvY2tldC5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgbG9nZ2luZy5nZXRMb2dnZXIoKS5lcnJvcihgZXJyb3Igb24gc29ja2V0LmlvOiAke2Vycn1gKTtcbiAgICAgIC8vIEV2ZW50IHVuc3VwcG9ydGVkIGluIFNvY2tldC5cbiAgICB9KTtcblxuICAgIHRoaXMuc29ja2V0Lm9uKCdkaXNjb25uZWN0aW5nJywgKCkgPT4ge1xuICAgICAgbG9nZ2luZy5nZXRMb2dnZXIoKS5lcnJvcihgZGlzY29ubmVjdGluZyBzb2NrZXQuaW9gKTtcbiAgICAgIC8vIEV2ZW50IHVuc3VwcG9ydGVkIGluIFNvY2tldC5cbiAgICB9KTtcblxuICAgIHRoaXMuc29ja2V0Lm9uKCdkaXNjb25uZWN0JywgKHJlYXNvbjogc3RyaW5nKSA9PiB7XG4gICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnY2xvc2UnLCByZWFzb24pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5zb2NrZXQub24oJ2RhdGEnLCAoZXZlbnQ6IERhdGFNZXNzYWdlfEJ1ZmZlcikgPT4ge1xuICAgICAgaWYgKGV2ZW50IGluc3RhbmNlb2YgQnVmZmVyKSB7XG4gICAgICAgIHRoaXMuZW1pdHRlci5lbWl0KCdiaW5hcnlfbWVzc2FnZScsIGV2ZW50KTtcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnQuaGFzT3duUHJvcGVydHkoJ2RhdGEnKSkge1xuICAgICAgICBjb25zdCBkYXRhTWVzc2FnZSA9IGV2ZW50IGFzIERhdGFNZXNzYWdlO1xuICAgICAgICBpZiAodHlwZW9mIGRhdGFNZXNzYWdlLmRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ3N0cmluZ19tZXNzYWdlJywgZGF0YU1lc3NhZ2UuZGF0YSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YU1lc3NhZ2UuZGF0YSBpbnN0YW5jZW9mIEJ1ZmZlcikge1xuICAgICAgICAgIHRoaXMuZW1pdHRlci5lbWl0KCdiaW5hcnlfbWVzc2FnZScsIGRhdGFNZXNzYWdlLmRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGFNZXNzYWdlLmRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICAgIHRoaXMuZW1pdHRlci5lbWl0KCdiaW5hcnlfbWVzc2FnZScsIEJ1ZmZlci5mcm9tKGRhdGFNZXNzYWdlLmRhdGEpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgc2VuZFN0cmluZyhkYXRhOiBzdHJpbmcpIHtcbiAgICB0aGlzLnNvY2tldC5lbWl0KCdkYXRhJywge2RhdGF9KTtcbiAgfVxuXG4gIHNlbmRCaW5hcnkoZGF0YTogQXJyYXlCdWZmZXIpIHtcbiAgICB0aGlzLnNvY2tldC5lbWl0KCdkYXRhJywge2RhdGF9KTtcbiAgfVxuXG4gIGNsb3NlKGtlZXBUcmFuc3BvcnRPcGVuOiBib29sZWFuKSB7XG4gICAgdGhpcy5zb2NrZXQuZGlzY29ubmVjdCgha2VlcFRyYW5zcG9ydE9wZW4pO1xuICB9XG59XG5cbi8qKiBBIHNvY2tldCBhZGFwdGVyIGZvciB3ZWJzb2NrZXRzLiAgKi9cbmV4cG9ydCBjbGFzcyBXZWJTb2NrZXRBZGFwdGVyIGV4dGVuZHMgQWRhcHRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgd3M6IFdlYlNvY2tldCkge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy53cy5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgbG9nZ2luZy5nZXRMb2dnZXIoKS5lcnJvcihgd2Vic29ja2V0IGVycm9yOiAke2Vycn1gKTtcbiAgICB9KTtcblxuICAgIHRoaXMud3Mub24oJ2Rpc2Nvbm5lY3RpbmcnLCAoKSA9PiB7XG4gICAgICBsb2dnaW5nLmdldExvZ2dlcigpLmVycm9yKGBkaXNjb25uZWN0aW5nIHdlYnNvY2tldGApO1xuICAgICAgLy8gRXZlbnQgdW5zdXBwb3J0ZWQgaW4gU29ja2V0LlxuICAgIH0pO1xuXG4gICAgdGhpcy53cy5vbignY2xvc2UnLCAoY29kZTogbnVtYmVyLCByZWFzb246IHN0cmluZykgPT4ge1xuICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ2Nsb3NlJywgYGNvZGU6JHtjb2RlfSByZWFzb246JHtyZWFzb259YCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLndzLm9uKCdtZXNzYWdlJywgKGRhdGEpID0+IHtcbiAgICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5lbWl0dGVyLmVtaXQoJ3N0cmluZ19tZXNzYWdlJywgZGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVtaXR0ZXIuZW1pdCgnYmluYXJ5X21lc3NhZ2UnLCBkYXRhKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHNlbmRTdHJpbmcoZGF0YTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMud3MucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0Lk9QRU4pIHtcbiAgICAgIHRoaXMud3Muc2VuZChkYXRhKTtcbiAgICB9XG4gIH1cblxuICBzZW5kQmluYXJ5KGRhdGE6IEFycmF5QnVmZmVyKSB7XG4gICAgaWYgKHRoaXMud3MucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0Lk9QRU4pIHtcbiAgICAgIHRoaXMud3Muc2VuZChkYXRhKTtcbiAgICB9XG4gIH1cblxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tdW51c2VkLXZhcmlhYmxlXG4gIGNsb3NlKGtlZXBUcmFuc3BvcnRPcGVuOiBib29sZWFuKSB7XG4gICAgdGhpcy53cy5jbG9zZSgpO1xuICB9XG59XG4iXX0=