"use strict";
/*
 * Copyright 2020 Google Inc. All rights reserved.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DapServer = void 0;
var childProcess = require("child_process");
var crypto = require("crypto");
var net = require("net");
var ws_1 = require("ws");
var jsonRpc = require("./json_rpc");
var logging = require("./logging");
var sockets_1 = require("./sockets");
var sessionCounter = 0;
/** Socket<->debug adapter. */
var Session = /** @class */ (function () {
    function Session(clientSocket, domainSocketPath) {
        var _this = this;
        this.clientSocket = clientSocket;
        this.id = sessionCounter++;
        this.clientSocket.onClose(function (reason) {
            logging.getLogger().debug('DAP socket disconnected for session %d reason: %s', _this.id, reason);
            // Handle client disconnects to close sockets, so as to free up resources.
            _this.close();
        });
        this.connect(domainSocketPath);
    }
    Session.prototype.close = function () {
        if (this.dapSocket) {
            this.dapSocket.destroy();
        }
        this.clientSocket.close(true);
    };
    Session.prototype.connect = function (domainSocketPath) {
        return __awaiter(this, void 0, Promise, function () {
            var rpc_1, dapSocket_1, message, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        logging.getLogger().info('DAP creating Socket to %s for session %d', domainSocketPath, this.id);
                        rpc_1 = new jsonRpc.JsonRpcReader(function (dapMessage) {
                            var message = { data: jsonRpc.encodeJsonRpc(dapMessage.content) };
                            _this.clientSocket.sendString(JSON.stringify(message));
                        });
                        dapSocket_1 = new net.Socket();
                        this.dapSocket = dapSocket_1;
                        dapSocket_1.on('data', function (data) {
                            rpc_1.append(data);
                        });
                        dapSocket_1.on('close', function () {
                            _this.close();
                        });
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                dapSocket_1.on('error', reject);
                                dapSocket_1.connect(domainSocketPath, resolve);
                            })];
                    case 1:
                        _a.sent();
                        message = { open: true };
                        this.clientSocket.sendString(JSON.stringify(message));
                        this.clientSocket.onBinaryMessage(function (data) {
                            dapSocket_1.write(Uint8Array.from(data));
                        });
                        this.clientSocket.onStringMessage(function (data) {
                            dapSocket_1.write(data);
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        logging.getLogger().error('Error connecting to Debug Adapter: %s', error_1);
                        this.close();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return Session;
}());
/** Debug Adapter Protocol server. */
var DapServer = /** @class */ (function () {
    function DapServer(muxBinary, server) {
        var _this = this;
        this.portPromise = this.spawnMultiplexer(muxBinary);
        server === null || server === void 0 ? void 0 : server.of('/debugger').on('connection', function (socket) {
            _this.portPromise.then(function (domainSocketPath) {
                // Session manages its own lifetime.
                // tslint:disable-next-line:no-unused-expression
                new Session(new sockets_1.SocketIOAdapter(socket), domainSocketPath);
            });
        });
    }
    DapServer.prototype.handleUpgrade = function (request, sock, head) {
        var _this = this;
        new ws_1.Server({ noServer: true }).handleUpgrade(request, sock, head, function (ws) {
            _this.portPromise.then(function (domainSocketPath) {
                // Session manages its own lifetime.
                // tslint:disable-next-line:no-unused-expression
                new Session(new sockets_1.WebSocketAdapter(ws), domainSocketPath);
            });
        });
    };
    DapServer.prototype.spawnMultiplexer = function (muxBinary) {
        return __awaiter(this, void 0, Promise, function () {
            var filename, muxProcess, muxOutput;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filename = "/tmp/debugger_".concat(crypto.randomBytes(6).readUIntLE(0, 6).toString(36));
                        muxProcess = childProcess.spawn(muxBinary, [
                            "--domain_socket_path=".concat(filename),
                        ]);
                        muxProcess.stdout.on('data', function (data) {
                            logging.getLogger().info('%s: %s', muxBinary, data);
                        });
                        muxProcess.stdout.on('error', function (data) {
                            logging.getLogger().info('%s: %s', muxBinary, data);
                        });
                        // dap_multiplexer logs to stderr so treat these as info not errors.
                        muxProcess.stderr.on('data', function (data) {
                            logging.getLogger().info('%s: %s', muxBinary, data);
                        });
                        muxProcess.stderr.on('error', function (data) {
                            logging.getLogger().info('%s: %s', muxBinary, data);
                        });
                        muxOutput = '';
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var connectionHandler = function (data) {
                                    muxOutput += data;
                                    // Wait for the process to indicate that it is listening.
                                    if (muxOutput.match(/DAP multiplexer listening on /)) {
                                        muxProcess.stdout.off('data', connectionHandler);
                                        resolve();
                                    }
                                };
                                muxProcess.stdout.on('data', connectionHandler);
                                muxProcess.stdout.on('error', reject);
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, filename];
                }
            });
        });
    };
    return DapServer;
}());
exports.DapServer = DapServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0aW9fdG9fZGFwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGhpcmRfcGFydHkvY29sYWIvc291cmNlcy9zb2NrZXRpb190b19kYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7OztHQWNHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw0Q0FBOEM7QUFDOUMsK0JBQWlDO0FBRWpDLHlCQUEyQjtBQUUzQix5QkFBMEI7QUFFMUIsb0NBQXNDO0FBQ3RDLG1DQUFxQztBQUNyQyxxQ0FBNEU7QUFFNUUsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0FBRXZCLDhCQUE4QjtBQUM5QjtJQUlFLGlCQUNxQixZQUE0QixFQUFFLGdCQUF3QjtRQUQzRSxpQkFhQztRQVpvQixpQkFBWSxHQUFaLFlBQVksQ0FBZ0I7UUFDL0MsSUFBSSxDQUFDLEVBQUUsR0FBRyxjQUFjLEVBQUUsQ0FBQztRQUUzQixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFDLE1BQU07WUFDL0IsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLEtBQUssQ0FDckIsbURBQW1ELEVBQUUsS0FBSSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUUxRSwwRUFBMEU7WUFDMUUsS0FBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVPLHVCQUFLLEdBQWI7UUFDRSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzNCLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRWEseUJBQU8sR0FB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R29vZ2xlIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdFxuICogdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2ZcbiAqIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUXG4gKiBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGVcbiAqIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zIHVuZGVyXG4gKiB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgKiBhcyBjaGlsZFByb2Nlc3MgZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCB7U2VydmVyIGFzIFNvY2tldElvU2VydmVyLCBTb2NrZXR9IGZyb20gJ3NvY2tldC5pbyc7XG5pbXBvcnQge1NlcnZlcn0gZnJvbSAnd3MnO1xuXG5pbXBvcnQgKiBhcyBqc29uUnBjIGZyb20gJy4vanNvbl9ycGMnO1xuaW1wb3J0ICogYXMgbG9nZ2luZyBmcm9tICcuL2xvZ2dpbmcnO1xuaW1wb3J0IHtBYnN0cmFjdFNvY2tldCwgU29ja2V0SU9BZGFwdGVyLCBXZWJTb2NrZXRBZGFwdGVyfSBmcm9tICcuL3NvY2tldHMnO1xuXG5sZXQgc2Vzc2lvbkNvdW50ZXIgPSAwO1xuXG4vKiogU29ja2V0PC0+ZGVidWcgYWRhcHRlci4gKi9cbmNsYXNzIFNlc3Npb24ge1xuICBwcml2YXRlIHJlYWRvbmx5IGlkOiBudW1iZXI7XG4gIHByaXZhdGUgZGFwU29ja2V0PzogbmV0LlNvY2tldDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVhZG9ubHkgY2xpZW50U29ja2V0OiBBYnN0cmFjdFNvY2tldCwgZG9tYWluU29ja2V0UGF0aDogc3RyaW5nKSB7XG4gICAgdGhpcy5pZCA9IHNlc3Npb25Db3VudGVyKys7XG5cbiAgICB0aGlzLmNsaWVudFNvY2tldC5vbkNsb3NlKChyZWFzb24pID0+IHtcbiAgICAgIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuZGVidWcoXG4gICAgICAgICAgJ0RBUCBzb2NrZXQgZGlzY29ubmVjdGVkIGZvciBzZXNzaW9uICVkIHJlYXNvbjogJXMnLCB0aGlzLmlkLCByZWFzb24pO1xuXG4gICAgICAvLyBIYW5kbGUgY2xpZW50IGRpc2Nvbm5lY3RzIHRvIGNsb3NlIHNvY2tldHMsIHNvIGFzIHRvIGZyZWUgdXAgcmVzb3VyY2VzLlxuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5jb25uZWN0KGRvbWFpblNvY2tldFBhdGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBjbG9zZSgpIHtcbiAgICBpZiAodGhpcy5kYXBTb2NrZXQpIHtcbiAgICAgIHRoaXMuZGFwU29ja2V0LmRlc3Ryb3koKTtcbiAgICB9XG4gICAgdGhpcy5jbGllbnRTb2NrZXQuY2xvc2UodHJ1ZSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNvbm5lY3QoZG9tYWluU29ja2V0UGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuaW5mbyhcbiAgICAgICAgICAnREFQIGNyZWF0aW5nIFNvY2tldCB0byAlcyBmb3Igc2Vzc2lvbiAlZCcsIGRvbWFpblNvY2tldFBhdGgsXG4gICAgICAgICAgdGhpcy5pZCk7XG5cbiAgICAgIGNvbnN0IHJwYyA9IG5ldyBqc29uUnBjLkpzb25ScGNSZWFkZXIoKGRhcE1lc3NhZ2UpID0+IHtcbiAgICAgICAgY29uc3QgbWVzc2FnZTpcbiAgICAgICAgICAgIE91dGdvaW5nTWVzc2FnZSA9IHtkYXRhOiBqc29uUnBjLmVuY29kZUpzb25ScGMoZGFwTWVzc2FnZS5jb250ZW50KX07XG4gICAgICAgIHRoaXMuY2xpZW50U29ja2V0LnNlbmRTdHJpbmcoSlNPTi5zdHJpbmdpZnkobWVzc2FnZSkpO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGRhcFNvY2tldCA9IG5ldyBuZXQuU29ja2V0KCk7XG4gICAgICB0aGlzLmRhcFNvY2tldCA9IGRhcFNvY2tldDtcbiAgICAgIGRhcFNvY2tldC5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgICAgcnBjLmFwcGVuZChkYXRhKTtcbiAgICAgIH0pO1xuICAgICAgZGFwU29ja2V0Lm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGRhcFNvY2tldC5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgICBkYXBTb2NrZXQuY29ubmVjdChkb21haW5Tb2NrZXRQYXRoLCByZXNvbHZlKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBOb3RpZnkgdGhlIGNsaWVudCB0aGF0IHRoZSBjb25uZWN0aW9uLmlzIG5vdyBvcGVuLlxuICAgICAgY29uc3QgbWVzc2FnZTogT3V0Z29pbmdNZXNzYWdlID0ge29wZW46IHRydWV9O1xuICAgICAgdGhpcy5jbGllbnRTb2NrZXQuc2VuZFN0cmluZyhKU09OLnN0cmluZ2lmeShtZXNzYWdlKSk7XG4gICAgICB0aGlzLmNsaWVudFNvY2tldC5vbkJpbmFyeU1lc3NhZ2UoKGRhdGE6IEJ1ZmZlcikgPT4ge1xuICAgICAgICBkYXBTb2NrZXQud3JpdGUoVWludDhBcnJheS5mcm9tKGRhdGEpKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5jbGllbnRTb2NrZXQub25TdHJpbmdNZXNzYWdlKChkYXRhOiBzdHJpbmcpID0+IHtcbiAgICAgICAgZGFwU29ja2V0LndyaXRlKGRhdGEpO1xuICAgICAgfSk7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tYW55XG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgbG9nZ2luZy5nZXRMb2dnZXIoKS5lcnJvcignRXJyb3IgY29ubmVjdGluZyB0byBEZWJ1ZyBBZGFwdGVyOiAlcycsIGVycm9yKTtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqIERlYnVnIEFkYXB0ZXIgUHJvdG9jb2wgc2VydmVyLiAqL1xuZXhwb3J0IGNsYXNzIERhcFNlcnZlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgcG9ydFByb21pc2U6IFByb21pc2U8c3RyaW5nPjtcbiAgY29uc3RydWN0b3IobXV4QmluYXJ5OiBzdHJpbmcsIHNlcnZlcj86IFNvY2tldElvU2VydmVyKSB7XG4gICAgdGhpcy5wb3J0UHJvbWlzZSA9IHRoaXMuc3Bhd25NdWx0aXBsZXhlcihtdXhCaW5hcnkpO1xuXG4gICAgc2VydmVyPy5vZignL2RlYnVnZ2VyJykub24oJ2Nvbm5lY3Rpb24nLCAoc29ja2V0OiBTb2NrZXQpID0+IHtcbiAgICAgIHRoaXMucG9ydFByb21pc2UudGhlbigoZG9tYWluU29ja2V0UGF0aCkgPT4ge1xuICAgICAgICAvLyBTZXNzaW9uIG1hbmFnZXMgaXRzIG93biBsaWZldGltZS5cbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXVudXNlZC1leHByZXNzaW9uXG4gICAgICAgIG5ldyBTZXNzaW9uKG5ldyBTb2NrZXRJT0FkYXB0ZXIoc29ja2V0KSwgZG9tYWluU29ja2V0UGF0aCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGhhbmRsZVVwZ3JhZGUocmVxdWVzdDogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHNvY2s6IG5ldC5Tb2NrZXQsIGhlYWQ6IEJ1ZmZlcikge1xuICAgIG5ldyBTZXJ2ZXIoe25vU2VydmVyOiB0cnVlfSkuaGFuZGxlVXBncmFkZShyZXF1ZXN0LCBzb2NrLCBoZWFkLCAod3MpID0+IHtcbiAgICAgIHRoaXMucG9ydFByb21pc2UudGhlbigoZG9tYWluU29ja2V0UGF0aCkgPT4ge1xuICAgICAgICAvLyBTZXNzaW9uIG1hbmFnZXMgaXRzIG93biBsaWZldGltZS5cbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXVudXNlZC1leHByZXNzaW9uXG4gICAgICAgIG5ldyBTZXNzaW9uKG5ldyBXZWJTb2NrZXRBZGFwdGVyKHdzKSwgZG9tYWluU29ja2V0UGF0aCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc3Bhd25NdWx0aXBsZXhlcihtdXhCaW5hcnk6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgZmlsZW5hbWUgPVxuICAgICAgICBgL3RtcC9kZWJ1Z2dlcl8ke2NyeXB0by5yYW5kb21CeXRlcyg2KS5yZWFkVUludExFKDAsIDYpLnRvU3RyaW5nKDM2KX1gO1xuICAgIGNvbnN0IG11eFByb2Nlc3MgPSBjaGlsZFByb2Nlc3Muc3Bhd24obXV4QmluYXJ5LCBbXG4gICAgICBgLS1kb21haW5fc29ja2V0X3BhdGg9JHtmaWxlbmFtZX1gLFxuICAgIF0pO1xuXG4gICAgbXV4UHJvY2Vzcy5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiB7XG4gICAgICBsb2dnaW5nLmdldExvZ2dlcigpLmluZm8oJyVzOiAlcycsIG11eEJpbmFyeSwgZGF0YSk7XG4gICAgfSk7XG4gICAgbXV4UHJvY2Vzcy5zdGRvdXQub24oJ2Vycm9yJywgKGRhdGE6IHN0cmluZykgPT4ge1xuICAgICAgbG9nZ2luZy5nZXRMb2dnZXIoKS5pbmZvKCclczogJXMnLCBtdXhCaW5hcnksIGRhdGEpO1xuICAgIH0pO1xuICAgIC8vIGRhcF9tdWx0aXBsZXhlciBsb2dzIHRvIHN0ZGVyciBzbyB0cmVhdCB0aGVzZSBhcyBpbmZvIG5vdCBlcnJvcnMuXG4gICAgbXV4UHJvY2Vzcy5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YTogc3RyaW5nKSA9PiB7XG4gICAgICBsb2dnaW5nLmdldExvZ2dlcigpLmluZm8oJyVzOiAlcycsIG11eEJpbmFyeSwgZGF0YSk7XG4gICAgfSk7XG4gICAgbXV4UHJvY2Vzcy5zdGRlcnIub24oJ2Vycm9yJywgKGRhdGE6IHN0cmluZykgPT4ge1xuICAgICAgbG9nZ2luZy5nZXRMb2dnZXIoKS5pbmZvKCclczogJXMnLCBtdXhCaW5hcnksIGRhdGEpO1xuICAgIH0pO1xuXG4gICAgbGV0IG11eE91dHB1dCA9ICcnO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGNvbm5lY3Rpb25IYW5kbGVyID0gKGRhdGE6IHN0cmluZykgPT4ge1xuICAgICAgICBtdXhPdXRwdXQgKz0gZGF0YTtcbiAgICAgICAgLy8gV2FpdCBmb3IgdGhlIHByb2Nlc3MgdG8gaW5kaWNhdGUgdGhhdCBpdCBpcyBsaXN0ZW5pbmcuXG4gICAgICAgIGlmIChtdXhPdXRwdXQubWF0Y2goL0RBUCBtdWx0aXBsZXhlciBsaXN0ZW5pbmcgb24gLykpIHtcbiAgICAgICAgICBtdXhQcm9jZXNzLnN0ZG91dC5vZmYoJ2RhdGEnLCBjb25uZWN0aW9uSGFuZGxlcik7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgbXV4UHJvY2Vzcy5zdGRvdXQub24oJ2RhdGEnLCBjb25uZWN0aW9uSGFuZGxlcik7XG4gICAgICBtdXhQcm9jZXNzLnN0ZG91dC5vbignZXJyb3InLCByZWplY3QpO1xuICAgIH0pO1xuICAgIHJldHVybiBmaWxlbmFtZTtcbiAgfVxufVxuXG5kZWNsYXJlIGludGVyZmFjZSBPdXRnb2luZ01lc3NhZ2Uge1xuICByZWFkb25seSBkYXRhPzogc3RyaW5nO1xuICByZWFkb25seSBvcGVuPzogYm9vbGVhbjtcbn1cbiJdfQ==