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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketIOToLsp = void 0;
exports.WebSocketToLsp = WebSocketToLsp;
var bunyan = require("bunyan");
var childProcess = require("child_process");
var crypto_1 = require("crypto");
var fs = require("fs");
var os = require("os");
var path = require("path");
var ws_1 = require("ws");
var jsonRpc = require("./json_rpc");
var logging = require("./logging");
var protocol = require("./lsp/protocol_node");
var sockets_1 = require("./sockets");
// We import the bunyan-rotating-file-stream package, which exports a
// constructor as a single object; we use lint disables here to make the usage
// below look reasonable.
//
// tslint:disable-next-line:no-require-imports variable-name enforce-name-casing
var RotatingFileStream = require('bunyan-rotating-file-stream');
var sessionCounter = 0;
var activeCount = 0;
/** Socket<->pyright LSP. */
var Session = /** @class */ (function () {
    function Session(socket, rootDirectory, contentDirectory, logsDir, pipLogsDir, proxyBinaryPath, proxyBinaryArgs) {
        var _this = this;
        this.socket = socket;
        this.closed = false;
        this.id = sessionCounter++;
        ++activeCount;
        var logPath = path.join(logsDir, "/lsp.".concat(sessionCounter, ".log"));
        this.consoleLogger = logging.getLogger();
        this.consoleLogger.info("LSP ".concat(this.id, " new session, ").concat(activeCount, " now active"));
        this.lspLogger = bunyan.createLogger({
            name: 'lsp',
            streams: [{
                    level: 'info',
                    stream: new RotatingFileStream({
                        path: logPath,
                        rotateExisting: false,
                        threshold: '2m',
                        totalSize: '20m'
                    }),
                }],
        });
        delete this.lspLogger.fields['hostname'];
        delete this.lspLogger.fields['name'];
        this.cancellation = new FileBasedCancellation(this.lspLogger);
        // To test against locally built versions of Pyright see the docs:
        // https://github.com/microsoft/pyright/blob/main/docs/build-debug.md
        //
        // You'll want to change the path to point to your local Pyright code e.g.
        // ${HOME}/pyright/packages/pyright/langserver.index.js
        //
        // Then from within the Pyright root folder rebuild the sources with:
        // npm run build:cli:dev
        var processName = 'node';
        var processArgs = [
            path.join(contentDirectory, '..', 'datalab', 'web', 'pyright', 'pyright-langserver.js'),
            // Using stdin/stdout for passing messages.
            '--stdio',
            // Use file-based cancellation to allow background analysis.
            "--cancellationReceive=file:".concat(this.cancellation.folderName),
        ];
        if (proxyBinaryPath) {
            processArgs.unshift(processName);
            processArgs.unshift('--');
            if (proxyBinaryArgs) {
                processArgs.unshift.apply(processArgs, __spreadArray([], __read(proxyBinaryArgs), false));
            }
            processName = proxyBinaryPath;
        }
        this.pyright = childProcess.spawn(processName, processArgs, {
            stdio: ['pipe'],
            cwd: rootDirectory,
        });
        fs.writeFile("/proc/".concat(this.pyright.pid, "/oom_score_adj"), '1000', function (error) {
            if (error) {
                _this.consoleLogger.error(error, "LSP set oom_score_adj");
                return;
            }
        });
        var rpc = new jsonRpc.JsonRpcReader(function (message) {
            if (!_this.processLanguageServerMessage(message.content)) {
                _this.lspLogger.info('c<--s' + message.content);
                _this.socket.sendString(message.content);
            }
            else {
                _this.lspLogger.info(' <--s' + message.content);
            }
        });
        var encoder = new TextEncoder();
        this.pyright.stdout.on('data', function (data) {
            if (_this.closed) {
                return;
            }
            try {
                rpc.append(encoder.encode(data));
            }
            catch (error) {
                _this.consoleLogger.error("LSP ".concat(_this.id, " error handling pyright data: ").concat(error));
            }
        });
        this.pyright.stderr.on('data', function (data) {
            var out = data.toString().replace(/\n$/, '');
            _this.consoleLogger.error("LSP ".concat(_this.id, " pyright error console: ").concat(out));
        });
        this.pyright.on('error', function (data) {
            _this.consoleLogger.error("LSP ".concat(_this.id, " pyright error: ").concat(data));
            _this.close();
        });
        this.socket.onClose(function (reason) {
            _this.consoleLogger.debug("LSP ".concat(_this.id, " Socket disconnected for reason: \"%s\""), reason);
            // Handle client disconnects to close sockets, so as to free up resources.
            _this.close();
        });
        this.socket.onStringMessage(function (data) {
            if (_this.closed) {
                return;
            }
            _this.handleDataFromClient(data);
        });
        try {
            this.pipLogWatcher = fs.watch(pipLogsDir, {
                recursive: false,
            }, function (event, filename) {
                if (filename === 'pip.log') {
                    _this.pipLogChanged();
                }
            });
        }
        catch (error) {
            this.consoleLogger.error("LSP ".concat(this.id, " Error starting pip.log watcher: %s"), error);
        }
    }
    Session.prototype.handleDataFromClient = function (data) {
        if (this.closed) {
            return;
        }
        try {
            this.lspLogger.info('c-->s' + data);
            // tslint:disable-next-line:no-any
            var message = JSON.parse(data);
            if (message.method === 'initialize') {
                // Patch the processId to be this one since the client does not does
                // not know about this process ID.
                message.params.processId = process.pid;
            }
            var json = JSON.stringify(message);
            json = json.replace(/[\u007F-\uFFFF]/g, function (chr) {
                // Replace non-ASCII characters with unicode encodings to avoid issues
                // sending unicode characters through stdin.
                // We don't need to handle surrogate pairs as these won't be a single
                // character in the JSON.
                return '\\u' + ('0000' + chr.charCodeAt(0).toString(16)).substr(-4);
            });
            this.pyright.stdin.write(jsonRpc.encodeJsonRpc(json));
        }
        catch (error) {
            // Errors propagated from here will disconnect the kernel.
            this.consoleLogger.error("LSP ".concat(this.id, " Socket error writing %s"), String(error));
            this.close();
        }
    };
    /** @return True if the message is consumed and should not be forwarded. */
    Session.prototype.processLanguageServerMessage = function (data) {
        try {
            var message = JSON.parse(data);
            if ('id' in message) {
                if ('method' in message && 'params' in message) {
                    this.handleRequest(message);
                }
                else {
                    this.handleResponse(message);
                }
            }
            else {
                return this.handleNotification(message);
            }
        }
        catch (error) {
            this.consoleLogger.error("LSP ".concat(this.id, " Error processing message: %s from \"%s\""), error, data);
        }
        return false;
    };
    /** @return True if the message is consumed and should not be forwarded. */
    Session.prototype.handleNotification = function (notification) {
        if (notification.method === protocol.Method.CancelRequest) {
            var cancellation = notification;
            this.cancellation.cancel(cancellation.params.id);
        }
        else if (notification.method === 'pyright/beginProgress' ||
            notification.method === 'pyright/reportProgress' ||
            notification.method === 'pyright/endProgress') {
            // Colab doesn't use these progress messages right now and they just
            // congest socket.io during completion flows.
            return true;
        }
        return false;
    };
    Session.prototype.handleRequest = function (request) {
        // Nothing to do here yet.
    };
    Session.prototype.handleResponse = function (response) {
        if (response.error &&
            response.error.code === protocol.ErrorCode.RequestCancelled &&
            response.id) {
            this.cancellation.cleanup(response.id);
        }
    };
    Session.prototype.pipLogChanged = function () {
        this.sendNotificationToClient(protocol.Method.ColabPipLogChanged, {});
    };
    Session.prototype.sendNotificationToClient = function (method, params) {
        if (this.closed) {
            return;
        }
        var json = {
            method: method,
            params: params,
            jsonrpc: '2.0',
        };
        var data = JSON.stringify(json);
        this.lspLogger.info('c<--s' + data);
        this.socket.sendString(data);
    };
    Session.prototype.close = function () {
        if (this.closed) {
            return;
        }
        this.closed = true;
        this.socket.close(true);
        // Force-kill pyright process to ensure full shutdown.
        // The process should effectively be read-only where it does not generate
        // any data other than what is sent back to this process.
        this.pyright.kill(9);
        if (this.pipLogWatcher) {
            this.pipLogWatcher.close();
        }
        this.cancellation.dispose();
        --activeCount;
        this.consoleLogger.info("LSP ".concat(this.id, " closed session, ").concat(activeCount, " remaining active"));
    };
    return Session;
}());
/** SocketIO to PyRight adapter. */
var SocketIOToLsp = /** @class */ (function () {
    function SocketIOToLsp(server, rootDirectory, contentDirectory, logsDir, pipLogsDir, languageServerProxy, languageServerProxyArgs) {
        // Cast to string is because the typings are missing the regexp override.
        // Documented in https://socket.io/docs/v2/namespaces/.
        server.of(new RegExp('/python-lsp/.*'))
            .on('connection', function (socket) {
            var proxyBinaryPath;
            var proxyBinaryArgs;
            if (languageServerProxy) {
                proxyBinaryPath = languageServerProxy;
                proxyBinaryArgs = languageServerProxyArgs;
            }
            // Session manages its own lifetime.
            // tslint:disable-next-line:no-unused-expression
            new Session(new sockets_1.SocketIOAdapter(socket), rootDirectory, contentDirectory, logsDir, pipLogsDir, proxyBinaryPath, proxyBinaryArgs);
        });
    }
    return SocketIOToLsp;
}());
exports.SocketIOToLsp = SocketIOToLsp;
var FileBasedCancellation = /** @class */ (function () {
    function FileBasedCancellation(logger) {
        this.logger = logger;
        this.folderName = (0, crypto_1.randomBytes)(21).toString('hex');
        // This must match the naming used in:
        // https://github.com/microsoft/pyright/blob/7bb059ecbab5c0c446d4dcf5376fc5ce8bd8cd26/packages/pyright-internal/src/common/cancellationUtils.ts#L189
        this.folderPath = path.join(os.tmpdir(), 'python-languageserver-cancellation', this.folderName);
        fs.mkdirSync(this.folderPath, { recursive: true });
    }
    FileBasedCancellation.prototype.cancel = function (id) {
        var _this = this;
        fs.promises.writeFile(this.getCancellationPath(id), '', { flag: 'w' })
            .catch(function (error) {
            _this.logger.error(error, "LSP FileBasedCancellation.cancel");
        });
    };
    FileBasedCancellation.prototype.cleanup = function (id) {
        var _this = this;
        fs.promises.unlink(this.getCancellationPath(id)).catch(function (error) {
            _this.logger.error(error, "LSP FileBasedCancellation.cleanup");
        });
    };
    FileBasedCancellation.prototype.dispose = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, files_1, files_1_1, file, error_1, e_1_1, error_2;
            var e_1, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 13, , 14]);
                        return [4 /*yield*/, fs.promises.readdir(this.folderPath)];
                    case 1:
                        files = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 9, 10, 11]);
                        files_1 = __values(files), files_1_1 = files_1.next();
                        _b.label = 3;
                    case 3:
                        if (!!files_1_1.done) return [3 /*break*/, 8];
                        file = files_1_1.value;
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, fs.promises.unlink(path.join(this.folderPath, file))];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _b.sent();
                        this.logger.error(error_1, "LSP FileBasedCancellation.dispose");
                        return [3 /*break*/, 7];
                    case 7:
                        files_1_1 = files_1.next();
                        return [3 /*break*/, 3];
                    case 8: return [3 /*break*/, 11];
                    case 9:
                        e_1_1 = _b.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 11];
                    case 10:
                        try {
                            if (files_1_1 && !files_1_1.done && (_a = files_1.return)) _a.call(files_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 11: return [4 /*yield*/, fs.promises.rmdir(this.folderPath)];
                    case 12:
                        _b.sent();
                        return [3 /*break*/, 14];
                    case 13:
                        error_2 = _b.sent();
                        this.logger.error(error_2, "LSP FileBasedCancellation.dispose");
                        return [3 /*break*/, 14];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    FileBasedCancellation.prototype.getCancellationPath = function (id) {
        // This must match the naming used in:
        // https://github.com/microsoft/pyright/blob/7bb059ecbab5c0c446d4dcf5376fc5ce8bd8cd26/packages/pyright-internal/src/common/cancellationUtils.ts#L193
        return path.join(this.folderPath, "cancellation-".concat(id, ".tmp"));
    };
    return FileBasedCancellation;
}());
/** Websocket to PyRight adapter. */
function WebSocketToLsp(request, sock, head, rootDirectory, contentDirectory, logsDir, pipLogsDir, languageServerProxy, languageServerProxyArgs) {
    new ws_1.Server({ noServer: true }).handleUpgrade(request, sock, head, function (ws) {
        var proxyBinaryPath;
        var proxyBinaryArgs;
        if (languageServerProxy) {
            proxyBinaryPath = languageServerProxy;
            proxyBinaryArgs = languageServerProxyArgs;
        }
        // Session manages its own lifetime.
        // tslint:disable-next-line:no-unused-expression
        new Session(new sockets_1.WebSocketAdapter(ws), rootDirectory, contentDirectory, logsDir, pipLogsDir, proxyBinaryPath, proxyBinaryArgs);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHl0aG9uX2xzcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RoaXJkX3BhcnR5L2NvbGFiL3NvdXJjZXMvcHl0aG9uX2xzcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7O0dBY0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQThXSCx3Q0FrQkM7QUE5WEQsK0JBQWlDO0FBQ2pDLDRDQUE4QztBQUM5QyxpQ0FBbUM7QUFDbkMsdUJBQXlCO0FBR3pCLHVCQUF5QjtBQUN6QiwyQkFBNkI7QUFFN0IseUJBQTBCO0FBRTFCLG9DQUFzQztBQUN0QyxtQ0FBcUM7QUFDckMsOENBQWdEO0FBQ2hELHFDQUE0RTtBQUk1RSxxRUFBcUU7QUFDckUsOEVBQThFO0FBQzlFLHlCQUF5QjtBQUN6QixFQUFFO0FBQ0YsZ0ZBQWdGO0FBQ2hGLElBQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFFbEUsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZCLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztBQUVwQiw0QkFBNEI7QUFDNUI7SUFTRSxpQkFDcUIsTUFBc0IsRUFBRSxhQUFxQixFQUM5RCxnQkFBd0IsRUFBRSxPQUFlLEVBQUUsVUFBa0IsRUFDN0QsZUFBd0IsRUFBRSxlQUFvQztRQUhsRSxpQkErSEM7UUE5SG9CLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBUG5DLFdBQU0sR0FBRyxLQUFLLENBQUM7UUFVckIsSUFBSSxDQUFDLEVBQUUsR0FBRyxjQUFjLEVBQUUsQ0FBQztRQUMzQixFQUFFLFdBQVcsQ0FBQztRQUVkLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQVEsY0FBYyxTQUFNLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMs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Q0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBQyxFQUFFO1FBQ2pFLElBQUksZUFBaUMsQ0FBQztRQUN0QyxJQUFJLGVBQW1DLENBQUM7UUFDeEMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3hCLGVBQWUsR0FBRyxtQkFBbUIsQ0FBQztZQUN0QyxlQUFlLEdBQUcsdUJBQXVCLENBQUM7UUFDNUMsQ0FBQztRQUNELG9DQUFvQztRQUNwQyxnREFBZ0Q7UUFDaEQsSUFBSSxPQUFPLENBQ1AsSUFBSSwwQkFBZ0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUNsRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3BELENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90XG4gKiB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZlxuICogdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVRcbiAqIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZVxuICogTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnMgdW5kZXJcbiAqIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCAqIGFzIGJ1bnlhbiBmcm9tICdidW55YW4nO1xuaW1wb3J0ICogYXMgY2hpbGRQcm9jZXNzIGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtyYW5kb21CeXRlc30gZnJvbSAnY3J5cHRvJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1NlcnZlciBhcyBTb2NrZXRJb1NlcnZlciwgU29ja2V0fSBmcm9tICdzb2NrZXQuaW8nO1xuaW1wb3J0IHtTZXJ2ZXJ9IGZyb20gJ3dzJztcblxuaW1wb3J0ICogYXMganNvblJwYyBmcm9tICcuL2pzb25fcnBjJztcbmltcG9ydCAqIGFzIGxvZ2dpbmcgZnJvbSAnLi9sb2dnaW5nJztcbmltcG9ydCAqIGFzIHByb3RvY29sIGZyb20gJy4vbHNwL3Byb3RvY29sX25vZGUnO1xuaW1wb3J0IHtBYnN0cmFjdFNvY2tldCwgU29ja2V0SU9BZGFwdGVyLCBXZWJTb2NrZXRBZGFwdGVyfSBmcm9tICcuL3NvY2tldHMnO1xuXG5cblxuLy8gV2UgaW1wb3J0IHRoZSBidW55YW4tcm90YXRpbmctZmlsZS1zdHJlYW0gcGFja2FnZSwgd2hpY2ggZXhwb3J0cyBhXG4vLyBjb25zdHJ1Y3RvciBhcyBhIHNpbmdsZSBvYmplY3Q7IHdlIHVzZSBsaW50IGRpc2FibGVzIGhlcmUgdG8gbWFrZSB0aGUgdXNhZ2Vcbi8vIGJlbG93IGxvb2sgcmVhc29uYWJsZS5cbi8vXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tcmVxdWlyZS1pbXBvcnRzIHZhcmlhYmxlLW5hbWUgZW5mb3JjZS1uYW1lLWNhc2luZ1xuY29uc3QgUm90YXRpbmdGaWxlU3RyZWFtID0gcmVxdWlyZSgnYnVueWFuLXJvdGF0aW5nLWZpbGUtc3RyZWFtJyk7XG5cbmxldCBzZXNzaW9uQ291bnRlciA9IDA7XG5sZXQgYWN0aXZlQ291bnQgPSAwO1xuXG4vKiogU29ja2V0PC0+cHlyaWdodCBMU1AuICovXG5jbGFzcyBTZXNzaW9uIHtcbiAgcHJpdmF0ZSByZWFkb25seSBpZDogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IHB5cmlnaHQ6IGNoaWxkUHJvY2Vzcy5DaGlsZFByb2Nlc3M7XG4gIHByaXZhdGUgY2xvc2VkID0gZmFsc2U7XG4gIHByaXZhdGUgcmVhZG9ubHkgbHNwTG9nZ2VyOiBidW55YW4uSUxvZ2dlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBjb25zb2xlTG9nZ2VyOiBidW55YW4uSUxvZ2dlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBwaXBMb2dXYXRjaGVyPzogZnMuRlNXYXRjaGVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGNhbmNlbGxhdGlvbjogRmlsZUJhc2VkQ2FuY2VsbGF0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWFkb25seSBzb2NrZXQ6IEFic3RyYWN0U29ja2V0LCByb290RGlyZWN0b3J5OiBzdHJpbmcsXG4gICAgICBjb250ZW50RGlyZWN0b3J5OiBzdHJpbmcsIGxvZ3NEaXI6IHN0cmluZywgcGlwTG9nc0Rpcjogc3RyaW5nLFxuICAgICAgcHJveHlCaW5hcnlQYXRoPzogc3RyaW5nLCBwcm94eUJpbmFyeUFyZ3M/OiBzdHJpbmdbXXx1bmRlZmluZWQpIHtcbiAgICB0aGlzLmlkID0gc2Vzc2lvbkNvdW50ZXIrKztcbiAgICArK2FjdGl2ZUNvdW50O1xuXG4gICAgY29uc3QgbG9nUGF0aCA9IHBhdGguam9pbihsb2dzRGlyLCBgL2xzcC4ke3Nlc3Npb25Db3VudGVyfS5sb2dgKTtcbiAgICB0aGlzLmNvbnNvbGVMb2dnZXIgPSBsb2dnaW5nLmdldExvZ2dlcigpO1xuICAgIHRoaXMuY29uc29sZUxvZ2dlci5pbmZvKFxuICAgICAgICBgTFNQICR7dGhpcy5pZH0gbmV3IHNlc3Npb24sICR7YWN0aXZlQ291bnR9IG5vdyBhY3RpdmVgKTtcblxuICAgIHRoaXMubHNwTG9nZ2VyID0gYnVueWFuLmNyZWF0ZUxvZ2dlcih7XG4gICAgICBuYW1lOiAnbHNwJyxcbiAgICAgIHN0cmVhbXM6IFt7XG4gICAgICAgIGxldmVsOiAnaW5mbycsXG4gICAgICAgIHN0cmVhbTogbmV3IFJvdGF0aW5nRmlsZVN0cmVhbSh7XG4gICAgICAgICAgcGF0aDogbG9nUGF0aCxcbiAgICAgICAgICByb3RhdGVFeGlzdGluZzogZmFsc2UsXG4gICAgICAgICAgdGhyZXNob2xkOiAnMm0nLFxuICAgICAgICAgIHRvdGFsU2l6ZTogJzIwbSdcbiAgICAgICAgfSksXG4gICAgICB9XSxcbiAgICB9KTtcbiAgICBkZWxldGUgdGhpcy5sc3BMb2dnZXIuZmllbGRzWydob3N0bmFtZSddO1xuICAgIGRlbGV0ZSB0aGlzLmxzcExvZ2dlci5maWVsZHNbJ25hbWUnXTtcbiAgICB0aGlzLmNhbmNlbGxhdGlvbiA9IG5ldyBGaWxlQmFzZWRDYW5jZWxsYXRpb24odGhpcy5sc3BMb2dnZXIpO1xuXG4gICAgLy8gVG8gdGVzdCBhZ2FpbnN0IGxvY2FsbHkgYnVpbHQgdmVyc2lvbnMgb2YgUHlyaWdodCBzZWUgdGhlIGRvY3M6XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9weXJpZ2h0L2Jsb2IvbWFpbi9kb2NzL2J1aWxkLWRlYnVnLm1kXG4gICAgLy9cbiAgICAvLyBZb3UnbGwgd2FudCB0byBjaGFuZ2UgdGhlIHBhdGggdG8gcG9pbnQgdG8geW91ciBsb2NhbCBQeXJpZ2h0IGNvZGUgZS5nLlxuICAgIC8vICR7SE9NRX0vcHlyaWdodC9wYWNrYWdlcy9weXJpZ2h0L2xhbmdzZXJ2ZXIuaW5kZXguanNcbiAgICAvL1xuICAgIC8vIFRoZW4gZnJvbSB3aXRoaW4gdGhlIFB5cmlnaHQgcm9vdCBmb2xkZXIgcmVidWlsZCB0aGUgc291cmNlcyB3aXRoOlxuICAgIC8vIG5wbSBydW4gYnVpbGQ6Y2xpOmRldlxuICAgIGxldCBwcm9jZXNzTmFtZSA9ICdub2RlJztcbiAgICBjb25zdCBwcm9jZXNzQXJncyA9IFtcbiAgICAgIHBhdGguam9pbihcbiAgICAgICAgICBjb250ZW50RGlyZWN0b3J5LCAnLi4nLCAnZGF0YWxhYicsICd3ZWInLCAncHlyaWdodCcsXG4gICAgICAgICAgJ3B5cmlnaHQtbGFuZ3NlcnZlci5qcycpLFxuICAgICAgLy8gVXNpbmcgc3RkaW4vc3Rkb3V0IGZvciBwYXNzaW5nIG1lc3NhZ2VzLlxuICAgICAgJy0tc3RkaW8nLFxuICAgICAgLy8gVXNlIGZpbGUtYmFzZWQgY2FuY2VsbGF0aW9uIHRvIGFsbG93IGJhY2tncm91bmQgYW5hbHlzaXMuXG4gICAgICBgLS1jYW5jZWxsYXRpb25SZWNlaXZlPWZpbGU6JHt0aGlzLmNhbmNlbGxhdGlvbi5mb2xkZXJOYW1lfWAsXG4gICAgXTtcblxuICAgIGlmIChwcm94eUJpbmFyeVBhdGgpIHtcbiAgICAgIHByb2Nlc3NBcmdzLnVuc2hpZnQocHJvY2Vzc05hbWUpO1xuICAgICAgcHJvY2Vzc0FyZ3MudW5zaGlmdCgnLS0nKTtcbiAgICAgIGlmIChwcm94eUJpbmFyeUFyZ3MpIHtcbiAgICAgICAgcHJvY2Vzc0FyZ3MudW5zaGlmdCguLi5wcm94eUJpbmFyeUFyZ3MpO1xuICAgICAgfVxuICAgICAgcHJvY2Vzc05hbWUgPSBwcm94eUJpbmFyeVBhdGg7XG4gICAgfVxuXG4gICAgdGhpcy5weXJpZ2h0ID0gY2hpbGRQcm9jZXNzLnNwYXduKHByb2Nlc3NOYW1lLCBwcm9jZXNzQXJncywge1xuICAgICAgc3RkaW86IFsncGlwZSddLFxuICAgICAgY3dkOiByb290RGlyZWN0b3J5LFxuICAgIH0pO1xuICAgIGZzLndyaXRlRmlsZShgL3Byb2MvJHt0aGlzLnB5cmlnaHQucGlkfS9vb21fc2NvcmVfYWRqYCwgJzEwMDAnLCAoZXJyb3IpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICB0aGlzLmNvbnNvbGVMb2dnZXIuZXJyb3IoZXJyb3IgYXMgRXJyb3IsIGBMU1Agc2V0IG9vbV9zY29yZV9hZGpgKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgcnBjID0gbmV3IGpzb25ScGMuSnNvblJwY1JlYWRlcigobWVzc2FnZSkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnByb2Nlc3NMYW5ndWFnZVNlcnZlck1lc3NhZ2UobWVzc2FnZS5jb250ZW50KSkge1xuICAgICAgICB0aGlzLmxzcExvZ2dlci5pbmZvKCdjPC0tcycgKyBtZXNzYWdlLmNvbnRlbnQpO1xuICAgICAgICB0aGlzLnNvY2tldC5zZW5kU3RyaW5nKG1lc3NhZ2UuY29udGVudCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxzcExvZ2dlci5pbmZvKCcgPC0tcycgKyBtZXNzYWdlLmNvbnRlbnQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuICAgIHRoaXMucHlyaWdodC5zdGRvdXQhLm9uKCdkYXRhJywgKGRhdGE6IHN0cmluZykgPT4ge1xuICAgICAgaWYgKHRoaXMuY2xvc2VkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIHJwYy5hcHBlbmQoZW5jb2Rlci5lbmNvZGUoZGF0YSkpO1xuICAgICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgICAgdGhpcy5jb25zb2xlTG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgYExTUCAke3RoaXMuaWR9IGVycm9yIGhhbmRsaW5nIHB5cmlnaHQgZGF0YTogJHtlcnJvcn1gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLnB5cmlnaHQuc3RkZXJyIS5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICAgIGNvbnN0IG91dCA9IGRhdGEudG9TdHJpbmcoKS5yZXBsYWNlKC9cXG4kLywgJycpO1xuICAgICAgdGhpcy5jb25zb2xlTG9nZ2VyLmVycm9yKGBMU1AgJHt0aGlzLmlkfSBweXJpZ2h0IGVycm9yIGNvbnNvbGU6ICR7b3V0fWApO1xuICAgIH0pO1xuXG4gICAgdGhpcy5weXJpZ2h0Lm9uKCdlcnJvcicsIChkYXRhOiBzdHJpbmcpID0+IHtcbiAgICAgIHRoaXMuY29uc29sZUxvZ2dlci5lcnJvcihgTFNQICR7dGhpcy5pZH0gcHlyaWdodCBlcnJvcjogJHtkYXRhfWApO1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5zb2NrZXQub25DbG9zZSgocmVhc29uKSA9PiB7XG4gICAgICB0aGlzLmNvbnNvbGVMb2dnZXIuZGVidWcoXG4gICAgICAgICAgYExTUCAke3RoaXMuaWR9IFNvY2tldCBkaXNjb25uZWN0ZWQgZm9yIHJlYXNvbjogXCIlc1wiYCwgcmVhc29uKTtcblxuICAgICAgLy8gSGFuZGxlIGNsaWVudCBkaXNjb25uZWN0cyB0byBjbG9zZSBzb2NrZXRzLCBzbyBhcyB0byBmcmVlIHVwIHJlc291cmNlcy5cbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuc29ja2V0Lm9uU3RyaW5nTWVzc2FnZShkYXRhID0+IHtcbiAgICAgIGlmICh0aGlzLmNsb3NlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLmhhbmRsZURhdGFGcm9tQ2xpZW50KGRhdGEpO1xuICAgIH0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIHRoaXMucGlwTG9nV2F0Y2hlciA9IGZzLndhdGNoKFxuICAgICAgICAgIHBpcExvZ3NEaXIsIHtcbiAgICAgICAgICAgIHJlY3Vyc2l2ZTogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAoZXZlbnQ6IHN0cmluZywgZmlsZW5hbWU6IHVua25vd24pID0+IHtcbiAgICAgICAgICAgIGlmIChmaWxlbmFtZSA9PT0gJ3BpcC5sb2cnKSB7XG4gICAgICAgICAgICAgIHRoaXMucGlwTG9nQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICB0aGlzLmNvbnNvbGVMb2dnZXIuZXJyb3IoXG4gICAgICAgICAgYExTUCAke3RoaXMuaWR9IEVycm9yIHN0YXJ0aW5nIHBpcC5sb2cgd2F0Y2hlcjogJXNgLCBlcnJvciBhcyB7fSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBoYW5kbGVEYXRhRnJvbUNsaWVudChkYXRhOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5jbG9zZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMubHNwTG9nZ2VyLmluZm8oJ2MtLT5zJyArIGRhdGEpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgY29uc3QgbWVzc2FnZSA9IEpTT04ucGFyc2UoZGF0YSkgYXMgYW55O1xuICAgICAgaWYgKG1lc3NhZ2UubWV0aG9kID09PSAnaW5pdGlhbGl6ZScpIHtcbiAgICAgICAgLy8gUGF0Y2ggdGhlIHByb2Nlc3NJZCB0byBiZSB0aGlzIG9uZSBzaW5jZSB0aGUgY2xpZW50IGRvZXMgbm90IGRvZXNcbiAgICAgICAgLy8gbm90IGtub3cgYWJvdXQgdGhpcyBwcm9jZXNzIElELlxuICAgICAgICBtZXNzYWdlLnBhcmFtcy5wcm9jZXNzSWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIH1cbiAgICAgIGxldCBqc29uID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZSk7XG4gICAgICBqc29uID0ganNvbi5yZXBsYWNlKC9bXFx1MDA3Ri1cXHVGRkZGXS9nLCAoY2hyKSA9PiB7XG4gICAgICAgIC8vIFJlcGxhY2Ugbm9uLUFTQ0lJIGNoYXJhY3RlcnMgd2l0aCB1bmljb2RlIGVuY29kaW5ncyB0byBhdm9pZCBpc3N1ZXNcbiAgICAgICAgLy8gc2VuZGluZyB1bmljb2RlIGNoYXJhY3RlcnMgdGhyb3VnaCBzdGRpbi5cbiAgICAgICAgLy8gV2UgZG9uJ3QgbmVlZCB0byBoYW5kbGUgc3Vycm9nYXRlIHBhaXJzIGFzIHRoZXNlIHdvbid0IGJlIGEgc2luZ2xlXG4gICAgICAgIC8vIGNoYXJhY3RlciBpbiB0aGUgSlNPTi5cbiAgICAgICAgcmV0dXJuICdcXFxcdScgKyAoJzAwMDAnICsgY2hyLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTQpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnB5cmlnaHQuc3RkaW4hLndyaXRlKGpzb25ScGMuZW5jb2RlSnNvblJwYyhqc29uKSk7XG4gICAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICAgIC8vIEVycm9ycyBwcm9wYWdhdGVkIGZyb20gaGVyZSB3aWxsIGRpc2Nvbm5lY3QgdGhlIGtlcm5lbC5cbiAgICAgIHRoaXMuY29uc29sZUxvZ2dlci5lcnJvcihcbiAgICAgICAgICBgTFNQICR7dGhpcy5pZH0gU29ja2V0IGVycm9yIHdyaXRpbmcgJXNgLCBTdHJpbmcoZXJyb3IpKTtcbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG4gIH1cblxuICAvKiogQHJldHVybiBUcnVlIGlmIHRoZSBtZXNzYWdlIGlzIGNvbnN1bWVkIGFuZCBzaG91bGQgbm90IGJlIGZvcndhcmRlZC4gKi9cbiAgcHJpdmF0ZSBwcm9jZXNzTGFuZ3VhZ2VTZXJ2ZXJNZXNzYWdlKGRhdGE6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gSlNPTi5wYXJzZShkYXRhKSBhcyBwcm90b2NvbC5NZXNzYWdlO1xuICAgICAgaWYgKCdpZCcgaW4gbWVzc2FnZSkge1xuICAgICAgICBpZiAoJ21ldGhvZCcgaW4gbWVzc2FnZSAmJiAncGFyYW1zJyBpbiBtZXNzYWdlKSB7XG4gICAgICAgICAgdGhpcy5oYW5kbGVSZXF1ZXN0KG1lc3NhZ2UgYXMgcHJvdG9jb2wuUmVxdWVzdE1lc3NhZ2U8dW5rbm93bj4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuaGFuZGxlUmVzcG9uc2UobWVzc2FnZSBhcyBwcm90b2NvbC5SZXNwb25zZU1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVOb3RpZmljYXRpb24oXG4gICAgICAgICAgICBtZXNzYWdlIGFzIHByb3RvY29sLk5vdGlmaWNhdGlvbk1lc3NhZ2U8dW5rbm93bj4pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICB0aGlzLmNvbnNvbGVMb2dnZXIuZXJyb3IoXG4gICAgICAgICAgYExTUCAke3RoaXMuaWR9IEVycm9yIHByb2Nlc3NpbmcgbWVzc2FnZTogJXMgZnJvbSBcIiVzXCJgLCBlcnJvciBhcyB7fSxcbiAgICAgICAgICBkYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqIEByZXR1cm4gVHJ1ZSBpZiB0aGUgbWVzc2FnZSBpcyBjb25zdW1lZCBhbmQgc2hvdWxkIG5vdCBiZSBmb3J3YXJkZWQuICovXG4gIHByaXZhdGUgaGFuZGxlTm90aWZpY2F0aW9uKFxuICAgICAgbm90aWZpY2F0aW9uOiBwcm90b2NvbC5Ob3RpZmljYXRpb25NZXNzYWdlPHVua25vd24+KTogYm9vbGVhbiB7XG4gICAgaWYgKG5vdGlmaWNhdGlvbi5tZXRob2QgPT09IHByb3RvY29sLk1ldGhvZC5DYW5jZWxSZXF1ZXN0KSB7XG4gICAgICBjb25zdCBjYW5jZWxsYXRpb24gPVxuICAgICAgICAgIG5vdGlmaWNhdGlvbiBhcyBwcm90b2NvbC5Ob3RpZmljYXRpb25NZXNzYWdlPHByb3RvY29sLkNhbmNlbFBhcmFtcz47XG4gICAgICB0aGlzLmNhbmNlbGxhdGlvbi5jYW5jZWwoY2FuY2VsbGF0aW9uLnBhcmFtcy5pZCk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgbm90aWZpY2F0aW9uLm1ldGhvZCA9PT0gJ3B5cmlnaHQvYmVnaW5Qcm9ncmVzcycgfHxcbiAgICAgICAgbm90aWZpY2F0aW9uLm1ldGhvZCA9PT0gJ3B5cmlnaHQvcmVwb3J0UHJvZ3Jlc3MnIHx8XG4gICAgICAgIG5vdGlmaWNhdGlvbi5tZXRob2QgPT09ICdweXJpZ2h0L2VuZFByb2dyZXNzJykge1xuICAgICAgLy8gQ29sYWIgZG9lc24ndCB1c2UgdGhlc2UgcHJvZ3Jlc3MgbWVzc2FnZXMgcmlnaHQgbm93IGFuZCB0aGV5IGp1c3RcbiAgICAgIC8vIGNvbmdlc3Qgc29ja2V0LmlvIGR1cmluZyBjb21wbGV0aW9uIGZsb3dzLlxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGhhbmRsZVJlcXVlc3QocmVxdWVzdDogcHJvdG9jb2wuUmVxdWVzdE1lc3NhZ2U8dW5rbm93bj4pIHtcbiAgICAvLyBOb3RoaW5nIHRvIGRvIGhlcmUgeWV0LlxuICB9XG5cbiAgaGFuZGxlUmVzcG9uc2UocmVzcG9uc2U6IHByb3RvY29sLlJlc3BvbnNlTWVzc2FnZSkge1xuICAgIGlmIChyZXNwb25zZS5lcnJvciAmJlxuICAgICAgICByZXNwb25zZS5lcnJvci5jb2RlID09PSBwcm90b2NvbC5FcnJvckNvZGUuUmVxdWVzdENhbmNlbGxlZCAmJlxuICAgICAgICByZXNwb25zZS5pZCkge1xuICAgICAgdGhpcy5jYW5jZWxsYXRpb24uY2xlYW51cChyZXNwb25zZS5pZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwaXBMb2dDaGFuZ2VkKCkge1xuICAgIHRoaXMuc2VuZE5vdGlmaWNhdGlvblRvQ2xpZW50KHByb3RvY29sLk1ldGhvZC5Db2xhYlBpcExvZ0NoYW5nZWQsIHt9KTtcbiAgfVxuXG4gIHByaXZhdGUgc2VuZE5vdGlmaWNhdGlvblRvQ2xpZW50PFQ+KG1ldGhvZDogcHJvdG9jb2wuTWV0aG9kLCBwYXJhbXM6IFQpIHtcbiAgICBpZiAodGhpcy5jbG9zZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QganNvbjogcHJvdG9jb2wuTm90aWZpY2F0aW9uTWVzc2FnZTxUPiA9IHtcbiAgICAgIG1ldGhvZCxcbiAgICAgIHBhcmFtcyxcbiAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgIH07XG4gICAgY29uc3QgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGpzb24pO1xuICAgIHRoaXMubHNwTG9nZ2VyLmluZm8oJ2M8LS1zJyArIGRhdGEpO1xuICAgIHRoaXMuc29ja2V0LnNlbmRTdHJpbmcoZGF0YSk7XG4gIH1cblxuICBwcml2YXRlIGNsb3NlKCkge1xuICAgIGlmICh0aGlzLmNsb3NlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmNsb3NlZCA9IHRydWU7XG4gICAgdGhpcy5zb2NrZXQuY2xvc2UodHJ1ZSk7XG4gICAgLy8gRm9yY2Uta2lsbCBweXJpZ2h0IHByb2Nlc3MgdG8gZW5zdXJlIGZ1bGwgc2h1dGRvd24uXG4gICAgLy8gVGhlIHByb2Nlc3Mgc2hvdWxkIGVmZmVjdGl2ZWx5IGJlIHJlYWQtb25seSB3aGVyZSBpdCBkb2VzIG5vdCBnZW5lcmF0ZVxuICAgIC8vIGFueSBkYXRhIG90aGVyIHRoYW4gd2hhdCBpcyBzZW50IGJhY2sgdG8gdGhpcyBwcm9jZXNzLlxuICAgIHRoaXMucHlyaWdodC5raWxsKDkpO1xuICAgIGlmICh0aGlzLnBpcExvZ1dhdGNoZXIpIHtcbiAgICAgIHRoaXMucGlwTG9nV2F0Y2hlci5jbG9zZSgpO1xuICAgIH1cbiAgICB0aGlzLmNhbmNlbGxhdGlvbi5kaXNwb3NlKCk7XG5cbiAgICAtLWFjdGl2ZUNvdW50O1xuICAgIHRoaXMuY29uc29sZUxvZ2dlci5pbmZvKFxuICAgICAgICBgTFNQICR7dGhpcy5pZH0gY2xvc2VkIHNlc3Npb24sICR7YWN0aXZlQ291bnR9IHJlbWFpbmluZyBhY3RpdmVgKTtcbiAgfVxufVxuXG4vKiogU29ja2V0SU8gdG8gUHlSaWdodCBhZGFwdGVyLiAqL1xuZXhwb3J0IGNsYXNzIFNvY2tldElPVG9Mc3Age1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHNlcnZlcjogU29ja2V0SW9TZXJ2ZXIsIHJvb3REaXJlY3Rvcnk6IHN0cmluZywgY29udGVudERpcmVjdG9yeTogc3RyaW5nLFxuICAgICAgbG9nc0Rpcjogc3RyaW5nLCBwaXBMb2dzRGlyOiBzdHJpbmcsIGxhbmd1YWdlU2VydmVyUHJveHk/OiBzdHJpbmcsXG4gICAgICBsYW5ndWFnZVNlcnZlclByb3h5QXJncz86IHN0cmluZ1tdKSB7XG4gICAgLy8gQ2FzdCB0byBzdHJpbmcgaXMgYmVjYXVzZSB0aGUgdHlwaW5ncyBhcmUgbWlzc2luZyB0aGUgcmVnZXhwIG92ZXJyaWRlLlxuICAgIC8vIERvY3VtZW50ZWQgaW4gaHR0cHM6Ly9zb2NrZXQuaW8vZG9jcy92Mi9uYW1lc3BhY2VzLy5cbiAgICBzZXJ2ZXIub2YobmV3IFJlZ0V4cCgnL3B5dGhvbi1sc3AvLionKSBhcyB1bmtub3duIGFzIHN0cmluZylcbiAgICAgICAgLm9uKCdjb25uZWN0aW9uJywgKHNvY2tldDogU29ja2V0KSA9PiB7XG4gICAgICAgICAgbGV0IHByb3h5QmluYXJ5UGF0aDogc3RyaW5nfHVuZGVmaW5lZDtcbiAgICAgICAgICBsZXQgcHJveHlCaW5hcnlBcmdzOiBzdHJpbmdbXXx1bmRlZmluZWQ7XG4gICAgICAgICAgaWYgKGxhbmd1YWdlU2VydmVyUHJveHkpIHtcbiAgICAgICAgICAgIHByb3h5QmluYXJ5UGF0aCA9IGxhbmd1YWdlU2VydmVyUHJveHk7XG4gICAgICAgICAgICBwcm94eUJpbmFyeUFyZ3MgPSBsYW5ndWFnZVNlcnZlclByb3h5QXJncztcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gU2Vzc2lvbiBtYW5hZ2VzIGl0cyBvd24gbGlmZXRpbWUuXG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXVudXNlZC1leHByZXNzaW9uXG4gICAgICAgICAgbmV3IFNlc3Npb24oXG4gICAgICAgICAgICAgIG5ldyBTb2NrZXRJT0FkYXB0ZXIoc29ja2V0KSwgcm9vdERpcmVjdG9yeSwgY29udGVudERpcmVjdG9yeSxcbiAgICAgICAgICAgICAgbG9nc0RpciwgcGlwTG9nc0RpciwgcHJveHlCaW5hcnlQYXRoLCBwcm94eUJpbmFyeUFyZ3MpO1xuICAgICAgICB9KTtcbiAgfVxufVxuXG5jbGFzcyBGaWxlQmFzZWRDYW5jZWxsYXRpb24ge1xuICBwcml2YXRlIHJlYWRvbmx5IGZvbGRlclBhdGg6IHN0cmluZztcbiAgcmVhZG9ubHkgZm9sZGVyTmFtZTogc3RyaW5nO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGxvZ2dlcjogYnVueWFuLklMb2dnZXIpIHtcbiAgICB0aGlzLmZvbGRlck5hbWUgPSByYW5kb21CeXRlcygyMSkudG9TdHJpbmcoJ2hleCcpO1xuICAgIC8vIFRoaXMgbXVzdCBtYXRjaCB0aGUgbmFtaW5nIHVzZWQgaW46XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9weXJpZ2h0L2Jsb2IvN2JiMDU5ZWNiYWI1YzBjNDQ2ZDRkY2Y1Mzc2ZmM1Y2U4YmQ4Y2QyNi9wYWNrYWdlcy9weXJpZ2h0LWludGVybmFsL3NyYy9jb21tb24vY2FuY2VsbGF0aW9uVXRpbHMudHMjTDE4OVxuICAgIHRoaXMuZm9sZGVyUGF0aCA9IHBhdGguam9pbihcbiAgICAgICAgb3MudG1wZGlyKCksICdweXRob24tbGFuZ3VhZ2VzZXJ2ZXItY2FuY2VsbGF0aW9uJywgdGhpcy5mb2xkZXJOYW1lKTtcbiAgICBmcy5ta2RpclN5bmModGhpcy5mb2xkZXJQYXRoLCB7cmVjdXJzaXZlOiB0cnVlfSk7XG4gIH1cblxuICBjYW5jZWwoaWQ6IHN0cmluZ3xudW1iZXIpIHtcbiAgICBmcy5wcm9taXNlcy53cml0ZUZpbGUodGhpcy5nZXRDYW5jZWxsYXRpb25QYXRoKGlkKSwgJycsIHtmbGFnOiAndyd9KVxuICAgICAgICAuY2F0Y2goKGVycm9yOiB1bmtub3duKSA9PiB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoZXJyb3IgYXMgRXJyb3IsIGBMU1AgRmlsZUJhc2VkQ2FuY2VsbGF0aW9uLmNhbmNlbGApO1xuICAgICAgICB9KTtcbiAgfVxuXG4gIGNsZWFudXAoaWQ6IHN0cmluZ3xudW1iZXIpIHtcbiAgICBmcy5wcm9taXNlcy51bmxpbmsodGhpcy5nZXRDYW5jZWxsYXRpb25QYXRoKGlkKSkuY2F0Y2goKGVycm9yOiB1bmtub3duKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihlcnJvciBhcyBFcnJvciwgYExTUCBGaWxlQmFzZWRDYW5jZWxsYXRpb24uY2xlYW51cGApO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZGlzcG9zZSgpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkZGlyKHRoaXMuZm9sZGVyUGF0aCk7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy51bmxpbmsocGF0aC5qb2luKHRoaXMuZm9sZGVyUGF0aCwgZmlsZSkpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICBlcnJvciBhcyBFcnJvciwgYExTUCBGaWxlQmFzZWRDYW5jZWxsYXRpb24uZGlzcG9zZWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhd2FpdCBmcy5wcm9taXNlcy5ybWRpcih0aGlzLmZvbGRlclBhdGgpO1xuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcihlcnJvciBhcyBFcnJvciwgYExTUCBGaWxlQmFzZWRDYW5jZWxsYXRpb24uZGlzcG9zZWApO1xuICAgIH1cbiAgfVxuXG4gIGdldENhbmNlbGxhdGlvblBhdGgoaWQ6IHN0cmluZ3xudW1iZXIpOiBzdHJpbmcge1xuICAgIC8vIFRoaXMgbXVzdCBtYXRjaCB0aGUgbmFtaW5nIHVzZWQgaW46XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9weXJpZ2h0L2Jsb2IvN2JiMDU5ZWNiYWI1YzBjNDQ2ZDRkY2Y1Mzc2ZmM1Y2U4YmQ4Y2QyNi9wYWNrYWdlcy9weXJpZ2h0LWludGVybmFsL3NyYy9jb21tb24vY2FuY2VsbGF0aW9uVXRpbHMudHMjTDE5M1xuICAgIHJldHVybiBwYXRoLmpvaW4odGhpcy5mb2xkZXJQYXRoLCBgY2FuY2VsbGF0aW9uLSR7aWR9LnRtcGApO1xuICB9XG59XG5cblxuLyoqIFdlYnNvY2tldCB0byBQeVJpZ2h0IGFkYXB0ZXIuICovXG5leHBvcnQgZnVuY3Rpb24gV2ViU29ja2V0VG9Mc3AoXG4gICAgcmVxdWVzdDogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHNvY2s6IG5ldC5Tb2NrZXQsIGhlYWQ6IEJ1ZmZlcixcbiAgICByb290RGlyZWN0b3J5OiBzdHJpbmcsIGNvbnRlbnREaXJlY3Rvcnk6IHN0cmluZywgbG9nc0Rpcjogc3RyaW5nLFxuICAgIHBpcExvZ3NEaXI6IHN0cmluZywgbGFuZ3VhZ2VTZXJ2ZXJQcm94eT86IHN0cmluZyxcbiAgICBsYW5ndWFnZVNlcnZlclByb3h5QXJncz86IHN0cmluZ1tdKSB7XG4gIG5ldyBTZXJ2ZXIoe25vU2VydmVyOiB0cnVlfSkuaGFuZGxlVXBncmFkZShyZXF1ZXN0LCBzb2NrLCBoZWFkLCAod3MpID0+IHtcbiAgICBsZXQgcHJveHlCaW5hcnlQYXRoOiBzdHJpbmd8dW5kZWZpbmVkO1xuICAgIGxldCBwcm94eUJpbmFyeUFyZ3M6IHN0cmluZ1tdfHVuZGVmaW5lZDtcbiAgICBpZiAobGFuZ3VhZ2VTZXJ2ZXJQcm94eSkge1xuICAgICAgcHJveHlCaW5hcnlQYXRoID0gbGFuZ3VhZ2VTZXJ2ZXJQcm94eTtcbiAgICAgIHByb3h5QmluYXJ5QXJncyA9IGxhbmd1YWdlU2VydmVyUHJveHlBcmdzO1xuICAgIH1cbiAgICAvLyBTZXNzaW9uIG1hbmFnZXMgaXRzIG93biBsaWZldGltZS5cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tdW51c2VkLWV4cHJlc3Npb25cbiAgICBuZXcgU2Vzc2lvbihcbiAgICAgICAgbmV3IFdlYlNvY2tldEFkYXB0ZXIod3MpLCByb290RGlyZWN0b3J5LCBjb250ZW50RGlyZWN0b3J5LCBsb2dzRGlyLFxuICAgICAgICBwaXBMb2dzRGlyLCBwcm94eUJpbmFyeVBhdGgsIHByb3h5QmluYXJ5QXJncyk7XG4gIH0pO1xufVxuIl19