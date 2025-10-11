"use strict";
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
exports.run = run;
exports.stop = stop;
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
var http = require("http");
var httpProxy = require("http-proxy");
var path = require("path");
var url = require("url");
var jupyter = require("./jupyter");
var logging = require("./logging");
var python_lsp_1 = require("./python_lsp");
var reverseProxy = require("./reverseProxy");
var socketio_to_dap_1 = require("./socketio_to_dap");
var socketio_to_pty_1 = require("./socketio_to_pty");
var sockets = require("./sockets");
var server;
/**
 * The application settings instance.
 */
var appSettings;
var fileshim;
/**
 * Handles all requests.
 * @param request the incoming HTTP request.
 * @param response the out-going HTTP response.
 * @path the parsed path in the request.
 */
function handleRequest(request, response, requestPath) {
    return __awaiter(this, void 0, void 0, function () {
        var host, url_1, projectId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // /files and /static are only used in runlocal.
                    if (fileshim &&
                        ((requestPath.indexOf('/api/contents') === 0) ||
                            (requestPath.indexOf('/files') === 0))) {
                        fileshim.web(request, response, null);
                        return [2 /*return*/];
                    }
                    // The explicit set of paths we proxy to jupyter.
                    if ((requestPath.indexOf('/api') === 0) ||
                        (requestPath.indexOf('/nbextensions') === 0) ||
                        (requestPath.indexOf('/files') === 0) ||
                        (requestPath.indexOf('/static') === 0)) {
                        jupyter.handleRequest(request, response);
                        return [2 /*return*/];
                    }
                    if (!(appSettings.colabRedirect && requestPath === '/')) return [3 /*break*/, 3];
                    host = process.env['WEB_HOST'] || '';
                    url_1 = appSettings.colabRedirect.replace('{jupyter_host}', host);
                    if (!appSettings.colabRedirect.includes('{project_id}')) return [3 /*break*/, 2];
                    return [4 /*yield*/, readGceProjectId()];
                case 1:
                    projectId = _a.sent();
                    url_1 = url_1.replace('{project_id}', projectId);
                    _a.label = 2;
                case 2:
                    response.writeHead(302, {
                        'Location': url_1,
                    });
                    response.end();
                    return [2 /*return*/];
                case 3:
                    // Not Found
                    response.statusCode = 404;
                    response.end();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Base logic for handling all requests sent to the proxy web server. Some
 * requests are handled within the server, while some are proxied to the
 * Jupyter notebook server.
 *
 * Error handling is left to the caller.
 *
 * @param request the incoming HTTP request.
 * @param response the out-going HTTP response.
 */
function uncheckedRequestHandler(request, response) {
    var e_1, _a;
    var parsedUrl = url.parse(request.url || '', true);
    var urlpath = parsedUrl.pathname || '';
    logging.logRequest(request, response);
    try {
        for (var socketIoHandlers_1 = __values(socketIoHandlers), socketIoHandlers_1_1 = socketIoHandlers_1.next(); !socketIoHandlers_1_1.done; socketIoHandlers_1_1 = socketIoHandlers_1.next()) {
            var handler = socketIoHandlers_1_1.value;
            if (handler.isPathProxied(urlpath)) {
                // Will automatically be handled by socket.io.
                return;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (socketIoHandlers_1_1 && !socketIoHandlers_1_1.done && (_a = socketIoHandlers_1.return)) _a.call(socketIoHandlers_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    var proxyPort = reverseProxy.getRequestPort(urlpath);
    if (sockets.isSocketIoPath(urlpath)) {
        // Will automatically be handled by socket.io.
    }
    else if (proxyPort && proxyPort !== request.socket.localPort) {
        // Do not allow proxying to this same port, as that can be used to mask the
        // target path.
        reverseProxy.handleRequest(request, response, proxyPort);
    }
    else {
        handleRequest(request, response, urlpath);
    }
}
/**
 * Handles all requests sent to the proxy web server. Some requests are handled
 * within the server, while some are proxied to the Jupyter notebook server.
 * @param request the incoming HTTP request.
 * @param response the out-going HTTP response.
 */
function requestHandler(request, response) {
    try {
        uncheckedRequestHandler(request, response);
    }
    catch (e) {
        logging.getLogger().error("Uncaught error handling a request to \"".concat(request.url, "\": ").concat(e));
    }
}
var socketIoHandlers = [];
/**
 * Runs the proxy web server.
 * @param settings the configuration settings to use.
 */
function run(settings) {
    jupyter.init(settings);
    reverseProxy.init(settings);
    appSettings = settings;
    if (settings.fileHandlerAddr) {
        fileshim = httpProxy.createProxyServer({ target: "http://".concat(appSettings.fileHandlerAddr) });
        fileshim.on('error', function (error, request, response) {
            logging.getLogger().error(error, "fileshim error for ".concat(request.url));
            response.writeHead(500, 'Internal Server Error');
            response.end();
        });
    }
    server = http.createServer(requestHandler);
    // Disable HTTP keep-alive connection timeouts in order to avoid connection
    // flakes. Details: b/112151064
    server.keepAliveTimeout = 0;
    var socketIoServer = sockets.init(server, settings);
    socketIoHandlers.push(new socketio_to_pty_1.SocketIoToPty('/tty', server));
    var dapServer;
    if (settings.debugAdapterMultiplexerPath) {
        dapServer =
            new socketio_to_dap_1.DapServer(settings.debugAdapterMultiplexerPath, socketIoServer);
    }
    var contentDir = path.join(settings.datalabRoot, settings.contentDir);
    var logsDir = path.join(settings.datalabRoot, '/var/colab/');
    var pipLogsDir = path.join(settings.datalabRoot, '/var/log/');
    // Handler manages its own lifetime.
    // tslint:disable-next-line:no-unused-expression
    new python_lsp_1.SocketIOToLsp(socketIoServer, __dirname, contentDir, logsDir, pipLogsDir, settings.languageServerProxy, settings.languageServerProxyArgs);
    server.on('upgrade', function (request, socket, head) {
        var parsedUrl = url.parse(request.url || '', true);
        var urlpath = parsedUrl.pathname || '';
        var proxyPort = reverseProxy.getRequestPort(urlpath);
        if (proxyPort && proxyPort !== request.socket.localPort) {
            reverseProxy.handleUpgrade(request, socket, head, proxyPort);
            return;
        }
        if (request.url === '/colab/tty') {
            (0, socketio_to_pty_1.WebSocketToPty)(request, socket, head);
            return;
        }
        if (request.url === '/colab/dap') {
            dapServer === null || dapServer === void 0 ? void 0 : dapServer.handleUpgrade(request, socket, head);
            return;
        }
        if (request.url === '/colab/lsp') {
            (0, python_lsp_1.WebSocketToLsp)(request, socket, head, __dirname, contentDir, logsDir, pipLogsDir, settings.languageServerProxy, settings.languageServerProxyArgs);
            return;
        }
        jupyter.handleSocket(request, socket, head);
    });
    logging.getLogger().info('Starting server at http://localhost:%d', settings.serverPort);
    process.on('SIGINT', function () { return process.exit(); });
    var options = {
        port: settings.serverPort,
        ipv6Only: false,
        host: settings.serverHost || ''
    };
    if ('TEST_TMPDIR' in process.env) {
        // Required to avoid "EAFNOSUPPORT: address family not supported" on
        // IPv6-only environments (notably, even with the host override below).
        options['ipv6Only'] = true;
        // ipv6Only alone isn't enough to avoid attempting to bind to 0.0.0.0 (which
        // fails on IPv6-only environments).  Need to specify an IP address because
        // DNS resolution even of ip6-localhost fails on some such environments.
        options['host'] = '::1';
    }
    server.listen(options);
}
/**
 * Stops the server and associated Jupyter server.
 */
function stop() {
    jupyter.close();
}
function readGceProjectId() {
    return __awaiter(this, void 0, Promise, function () {
        var metadataHost, port, portParts, projectId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    metadataHost = 'metadata.google.internal';
                    port = undefined;
                    if (process.env['GCE_METADATA_HOST']) {
                        metadataHost = process.env['GCE_METADATA_HOST'];
                        portParts = metadataHost.match(/(.*):(\d+)/);
                        if (portParts) {
                            metadataHost = portParts[1];
                            if (metadataHost.startsWith('[')) {
                                metadataHost = metadataHost.substring(1, metadataHost.length - 1);
                            }
                            port = Number(portParts[2]);
                        }
                    }
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            http.get({
                                hostname: metadataHost,
                                port: port,
                                path: '/computeMetadata/v1/project/project-id',
                                headers: { 'Metadata-Flavor': 'Google' }
                            }, function (response) {
                                var data = '';
                                response.on('data', function (chunk) {
                                    data += chunk;
                                });
                                response.on('end', function () {
                                    resolve(data);
                                });
                            })
                                .on('error', reject)
                                .end();
                        })];
                case 1:
                    projectId = _a.sent();
                    return [2 /*return*/, projectId.trim()];
            }
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGhpcmRfcGFydHkvY29sYWIvc291cmNlcy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTZJQSxrQkFzRkM7QUFLRCxvQkFFQztBQTFPRDs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILDJCQUE2QjtBQUM3QixzQ0FBd0M7QUFFeEMsMkJBQTZCO0FBQzdCLHlCQUEyQjtBQUczQixtQ0FBcUM7QUFDckMsbUNBQXFDO0FBQ3JDLDJDQUEyRDtBQUMzRCw2Q0FBK0M7QUFDL0MscURBQTRDO0FBQzVDLHFEQUFnRTtBQUNoRSxtQ0FBcUM7QUFFckMsSUFBSSxNQUFtQixDQUFDO0FBQ3hCOztHQUVHO0FBQ0gsSUFBSSxXQUF3QixDQUFDO0FBRTdCLElBQUksUUFBK0IsQ0FBQztBQUdwQzs7Ozs7R0FLRztBQUNILFNBQWUsYUFBYSxDQUN4QixPQUE2QixFQUFFLFFBQTZCLEVBQzVELFdBQW1COzs7Ozs7b0JBQ3JCLGdEQUFnRDtvQkFFaEQsSUFBSSxRQUFRO3dCQUNSLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQzs0QkFDNUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDNUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUN0QyxzQkFBTztvQkFDVCxDQUFDO29CQUNELGlEQUFpRDtvQkFDakQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNuQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FB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QUFDLEdBQUcsQ0FDQTtnQ0FDRSxRQUFRLEVBQUUsWUFBWTtnQ0FDdEIsSUFBSSxNQUFBO2dDQUNKLElBQUksRUFBRSx3Q0FBd0M7Z0NBQzlDLE9BQU8sRUFBRSxFQUFDLGlCQUFpQixFQUFFLFFBQVEsRUFBQzs2QkFDdkMsRUFDRCxVQUFDLFFBQVE7Z0NBQ1AsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO2dDQUNkLFFBQVEsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLFVBQUMsS0FBSztvQ0FDeEIsSUFBSSxJQUFJLEtBQUssQ0FBQztnQ0FDaEIsQ0FBQyxDQUFDLENBQUM7Z0NBQ0gsUUFBUSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUU7b0NBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQ0FDaEIsQ0FBQyxDQUFDLENBQUM7NEJBQ0wsQ0FBQyxDQUFDO2lDQUNMLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDO2lDQUNuQixHQUFHLEVBQUUsQ0FBQzt3QkFDYixDQUFDLENBQUMsRUFBQTs7b0JBbkJJLFNBQVMsR0FBRyxTQW1CaEI7b0JBQ0Ysc0JBQU8sU0FBUyxDQUFDLElBQUksRUFBRSxFQUFDOzs7O0NBQ3pCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAyMDE1IEdvb2dsZSBJbmMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3RcbiAqIHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mXG4gKiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVFxuICogV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlXG4gKiBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9ucyB1bmRlclxuICogdGhlIExpY2Vuc2UuXG4gKi9cbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBodHRwUHJveHkgZnJvbSAnaHR0cC1wcm94eSc7XG5pbXBvcnQgKiBhcyBuZXQgZnJvbSAnbmV0JztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcblxuaW1wb3J0IHtBcHBTZXR0aW5nc30gZnJvbSAnLi9hcHBTZXR0aW5ncyc7XG5pbXBvcnQgKiBhcyBqdXB5dGVyIGZyb20gJy4vanVweXRlcic7XG5pbXBvcnQgKiBhcyBsb2dnaW5nIGZyb20gJy4vbG9nZ2luZyc7XG5pbXBvcnQge1NvY2tldElPVG9Mc3AsIFdlYlNvY2tldFRvTHNwfSBmcm9tICcuL3B5dGhvbl9sc3AnO1xuaW1wb3J0ICogYXMgcmV2ZXJzZVByb3h5IGZyb20gJy4vcmV2ZXJzZVByb3h5JztcbmltcG9ydCB7RGFwU2VydmVyfSBmcm9tICcuL3NvY2tldGlvX3RvX2RhcCc7XG5pbXBvcnQge1NvY2tldElvVG9QdHksIFdlYlNvY2tldFRvUHR5fSBmcm9tICcuL3NvY2tldGlvX3RvX3B0eSc7XG5pbXBvcnQgKiBhcyBzb2NrZXRzIGZyb20gJy4vc29ja2V0cyc7XG5cbmxldCBzZXJ2ZXI6IGh0dHAuU2VydmVyO1xuLyoqXG4gKiBUaGUgYXBwbGljYXRpb24gc2V0dGluZ3MgaW5zdGFuY2UuXG4gKi9cbmxldCBhcHBTZXR0aW5nczogQXBwU2V0dGluZ3M7XG5cbmxldCBmaWxlc2hpbTogaHR0cFByb3h5LlByb3h5U2VydmVyO1xuXG5cbi8qKlxuICogSGFuZGxlcyBhbGwgcmVxdWVzdHMuXG4gKiBAcGFyYW0gcmVxdWVzdCB0aGUgaW5jb21pbmcgSFRUUCByZXF1ZXN0LlxuICogQHBhcmFtIHJlc3BvbnNlIHRoZSBvdXQtZ29pbmcgSFRUUCByZXNwb25zZS5cbiAqIEBwYXRoIHRoZSBwYXJzZWQgcGF0aCBpbiB0aGUgcmVxdWVzdC5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVxdWVzdChcbiAgICByZXF1ZXN0OiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzcG9uc2U6IGh0dHAuU2VydmVyUmVzcG9uc2UsXG4gICAgcmVxdWVzdFBhdGg6IHN0cmluZykge1xuICAvLyAvZmlsZXMgYW5kIC9zdGF0aWMgYXJlIG9ubHkgdXNlZCBpbiBydW5sb2NhbC5cblxuICBpZiAoZmlsZXNoaW0gJiZcbiAgICAgICgocmVxdWVzdFBhdGguaW5kZXhPZignL2FwaS9jb250ZW50cycpID09PSAwKSB8fFxuICAgICAgIChyZXF1ZXN0UGF0aC5pbmRleE9mKCcvZmlsZXMnKSA9PT0gMCkpKSB7XG4gICAgZmlsZXNoaW0ud2ViKHJlcXVlc3QsIHJlc3BvbnNlLCBudWxsKTtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gVGhlIGV4cGxpY2l0IHNldCBvZiBwYXRocyB3ZSBwcm94eSB0byBqdXB5dGVyLlxuICBpZiAoKHJlcXVlc3RQYXRoLmluZGV4T2YoJy9hcGknKSA9PT0gMCkgfHxcbiAgICAgIChyZXF1ZXN0UGF0aC5pbmRleE9mKCcvbmJleHRlbnNpb25zJykgPT09IDApIHx8XG4gICAgICAocmVxdWVzdFBhdGguaW5kZXhPZignL2ZpbGVzJykgPT09IDApIHx8XG4gICAgICAocmVxdWVzdFBhdGguaW5kZXhPZignL3N0YXRpYycpID09PSAwKSkge1xuICAgIGp1cHl0ZXIuaGFuZGxlUmVxdWVzdChyZXF1ZXN0LCByZXNwb25zZSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChhcHBTZXR0aW5ncy5jb2xhYlJlZGlyZWN0ICYmIHJlcXVlc3RQYXRoID09PSAnLycpIHtcbiAgICBjb25zdCBob3N0ID0gcHJvY2Vzcy5lbnZbJ1dFQl9IT1NUJ10gfHwgJyc7XG4gICAgbGV0IHVybCA9IGFwcFNldHRpbmdzLmNvbGFiUmVkaXJlY3QucmVwbGFjZSgne2p1cHl0ZXJfaG9zdH0nLCBob3N0KTtcbiAgICBpZiAoYXBwU2V0dGluZ3MuY29sYWJSZWRpcmVjdC5pbmNsdWRlcygne3Byb2plY3RfaWR9JykpIHtcbiAgICAgIGNvbnN0IHByb2plY3RJZCA9IGF3YWl0IHJlYWRHY2VQcm9qZWN0SWQoKTtcbiAgICAgIHVybCA9IHVybC5yZXBsYWNlKCd7cHJvamVjdF9pZH0nLCBwcm9qZWN0SWQpO1xuICAgIH1cbiAgICByZXNwb25zZS53cml0ZUhlYWQoMzAyLCB7XG4gICAgICAnTG9jYXRpb24nOiB1cmwsXG4gICAgfSk7XG4gICAgcmVzcG9uc2UuZW5kKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTm90IEZvdW5kXG4gIHJlc3BvbnNlLnN0YXR1c0NvZGUgPSA0MDQ7XG4gIHJlc3BvbnNlLmVuZCgpO1xufVxuXG4vKipcbiAqIEJhc2UgbG9naWMgZm9yIGhhbmRsaW5nIGFsbCByZXF1ZXN0cyBzZW50IHRvIHRoZSBwcm94eSB3ZWIgc2VydmVyLiBTb21lXG4gKiByZXF1ZXN0cyBhcmUgaGFuZGxlZCB3aXRoaW4gdGhlIHNlcnZlciwgd2hpbGUgc29tZSBhcmUgcHJveGllZCB0byB0aGVcbiAqIEp1cHl0ZXIgbm90ZWJvb2sgc2VydmVyLlxuICpcbiAqIEVycm9yIGhhbmRsaW5nIGlzIGxlZnQgdG8gdGhlIGNhbGxlci5cbiAqXG4gKiBAcGFyYW0gcmVxdWVzdCB0aGUgaW5jb21pbmcgSFRUUCByZXF1ZXN0LlxuICogQHBhcmFtIHJlc3BvbnNlIHRoZSBvdXQtZ29pbmcgSFRUUCByZXNwb25zZS5cbiAqL1xuZnVuY3Rpb24gdW5jaGVja2VkUmVxdWVzdEhhbmRsZXIoXG4gICAgcmVxdWVzdDogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlc3BvbnNlOiBodHRwLlNlcnZlclJlc3BvbnNlKSB7XG4gIGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShyZXF1ZXN0LnVybCB8fCAnJywgdHJ1ZSk7XG4gIGNvbnN0IHVybHBhdGggPSBwYXJzZWRVcmwucGF0aG5hbWUgfHwgJyc7XG5cbiAgbG9nZ2luZy5sb2dSZXF1ZXN0KHJlcXVlc3QsIHJlc3BvbnNlKTtcblxuICBmb3IgKGNvbnN0IGhhbmRsZXIgb2Ygc29ja2V0SW9IYW5kbGVycykge1xuICAgIGlmIChoYW5kbGVyLmlzUGF0aFByb3hpZWQodXJscGF0aCkpIHtcbiAgICAgIC8vIFdpbGwgYXV0b21hdGljYWxseSBiZSBoYW5kbGVkIGJ5IHNvY2tldC5pby5cbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cblxuICBjb25zdCBwcm94eVBvcnQgPSByZXZlcnNlUHJveHkuZ2V0UmVxdWVzdFBvcnQodXJscGF0aCk7XG4gIGlmIChzb2NrZXRzLmlzU29ja2V0SW9QYXRoKHVybHBhdGgpKSB7XG4gICAgLy8gV2lsbCBhdXRvbWF0aWNhbGx5IGJlIGhhbmRsZWQgYnkgc29ja2V0LmlvLlxuICB9IGVsc2UgaWYgKHByb3h5UG9ydCAmJiBwcm94eVBvcnQgIT09IHJlcXVlc3Quc29ja2V0LmxvY2FsUG9ydCkge1xuICAgIC8vIERvIG5vdCBhbGxvdyBwcm94eWluZyB0byB0aGlzIHNhbWUgcG9ydCwgYXMgdGhhdCBjYW4gYmUgdXNlZCB0byBtYXNrIHRoZVxuICAgIC8vIHRhcmdldCBwYXRoLlxuICAgIHJldmVyc2VQcm94eS5oYW5kbGVSZXF1ZXN0KHJlcXVlc3QsIHJlc3BvbnNlLCBwcm94eVBvcnQpO1xuICB9IGVsc2Uge1xuICAgIGhhbmRsZVJlcXVlc3QocmVxdWVzdCwgcmVzcG9uc2UsIHVybHBhdGgpO1xuICB9XG59XG5cbi8qKlxuICogSGFuZGxlcyBhbGwgcmVxdWVzdHMgc2VudCB0byB0aGUgcHJveHkgd2ViIHNlcnZlci4gU29tZSByZXF1ZXN0cyBhcmUgaGFuZGxlZFxuICogd2l0aGluIHRoZSBzZXJ2ZXIsIHdoaWxlIHNvbWUgYXJlIHByb3hpZWQgdG8gdGhlIEp1cHl0ZXIgbm90ZWJvb2sgc2VydmVyLlxuICogQHBhcmFtIHJlcXVlc3QgdGhlIGluY29taW5nIEhUVFAgcmVxdWVzdC5cbiAqIEBwYXJhbSByZXNwb25zZSB0aGUgb3V0LWdvaW5nIEhUVFAgcmVzcG9uc2UuXG4gKi9cbmZ1bmN0aW9uIHJlcXVlc3RIYW5kbGVyKFxuICAgIHJlcXVlc3Q6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXNwb25zZTogaHR0cC5TZXJ2ZXJSZXNwb25zZSkge1xuICB0cnkge1xuICAgIHVuY2hlY2tlZFJlcXVlc3RIYW5kbGVyKHJlcXVlc3QsIHJlc3BvbnNlKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuZXJyb3IoXG4gICAgICAgIGBVbmNhdWdodCBlcnJvciBoYW5kbGluZyBhIHJlcXVlc3QgdG8gXCIke3JlcXVlc3QudXJsfVwiOiAke2V9YCk7XG4gIH1cbn1cblxuY29uc3Qgc29ja2V0SW9IYW5kbGVyczogU29ja2V0SW9Ub1B0eVtdID0gW107XG5cbi8qKlxuICogUnVucyB0aGUgcHJveHkgd2ViIHNlcnZlci5cbiAqIEBwYXJhbSBzZXR0aW5ncyB0aGUgY29uZmlndXJhdGlvbiBzZXR0aW5ncyB0byB1c2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBydW4oc2V0dGluZ3M6IEFwcFNldHRpbmdzKTogdm9pZCB7XG4gIGp1cHl0ZXIuaW5pdChzZXR0aW5ncyk7XG4gIHJldmVyc2VQcm94eS5pbml0KHNldHRpbmdzKTtcbiAgYXBwU2V0dGluZ3MgPSBzZXR0aW5ncztcblxuICBpZiAoc2V0dGluZ3MuZmlsZUhhbmRsZXJBZGRyKSB7XG4gICAgZmlsZXNoaW0gPSBodHRwUHJveHkuY3JlYXRlUHJveHlTZXJ2ZXIoXG4gICAgICAgIHt0YXJnZXQ6IGBodHRwOi8vJHthcHBTZXR0aW5ncy5maWxlSGFuZGxlckFkZHJ9YH0pO1xuICAgIGZpbGVzaGltLm9uKCdlcnJvcicsIChlcnJvciwgcmVxdWVzdCwgcmVzcG9uc2UpID0+IHtcbiAgICAgIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuZXJyb3IoZXJyb3IsIGBmaWxlc2hpbSBlcnJvciBmb3IgJHtyZXF1ZXN0LnVybH1gKTtcbiAgICAgIHJlc3BvbnNlLndyaXRlSGVhZCg1MDAsICdJbnRlcm5hbCBTZXJ2ZXIgRXJyb3InKTtcbiAgICAgIHJlc3BvbnNlLmVuZCgpO1xuICAgIH0pO1xuICB9XG5cbiAgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIocmVxdWVzdEhhbmRsZXIpO1xuICAvLyBEaXNhYmxlIEhUVFAga2VlcC1hbGl2ZSBjb25uZWN0aW9uIHRpbWVvdXRzIGluIG9yZGVyIHRvIGF2b2lkIGNvbm5lY3Rpb25cbiAgLy8gZmxha2VzLiBEZXRhaWxzOiBiLzExMjE1MTA2NFxuICBzZXJ2ZXIua2VlcEFsaXZlVGltZW91dCA9IDA7XG5cbiAgY29uc3Qgc29ja2V0SW9TZXJ2ZXIgPSBzb2NrZXRzLmluaXQoc2VydmVyLCBzZXR0aW5ncyk7XG5cbiAgc29ja2V0SW9IYW5kbGVycy5wdXNoKG5ldyBTb2NrZXRJb1RvUHR5KCcvdHR5Jywgc2VydmVyKSk7XG5cbiAgbGV0IGRhcFNlcnZlcjogRGFwU2VydmVyO1xuICBpZiAoc2V0dGluZ3MuZGVidWdBZGFwdGVyTXVsdGlwbGV4ZXJQYXRoKSB7XG4gICAgZGFwU2VydmVyID1cbiAgICAgICAgbmV3IERhcFNlcnZlcihzZXR0aW5ncy5kZWJ1Z0FkYXB0ZXJNdWx0aXBsZXhlclBhdGgsIHNvY2tldElvU2VydmVyKTtcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnREaXIgPSBwYXRoLmpvaW4oc2V0dGluZ3MuZGF0YWxhYlJvb3QsIHNldHRpbmdzLmNvbnRlbnREaXIpO1xuICBjb25zdCBsb2dzRGlyID0gcGF0aC5qb2luKHNldHRpbmdzLmRhdGFsYWJSb290LCAnL3Zhci9jb2xhYi8nKTtcbiAgY29uc3QgcGlwTG9nc0RpciA9IHBhdGguam9pbihzZXR0aW5ncy5kYXRhbGFiUm9vdCwgJy92YXIvbG9nLycpO1xuXG4gIC8vIEhhbmRsZXIgbWFuYWdlcyBpdHMgb3duIGxpZmV0aW1lLlxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tdW51c2VkLWV4cHJlc3Npb25cbiAgbmV3IFNvY2tldElPVG9Mc3AoXG4gICAgICBzb2NrZXRJb1NlcnZlciwgX19kaXJuYW1lLCBjb250ZW50RGlyLCBsb2dzRGlyLCBwaXBMb2dzRGlyLFxuICAgICAgc2V0dGluZ3MubGFuZ3VhZ2VTZXJ2ZXJQcm94eSwgc2V0dGluZ3MubGFuZ3VhZ2VTZXJ2ZXJQcm94eUFyZ3MpO1xuXG4gIHNlcnZlci5vbihcbiAgICAgICd1cGdyYWRlJyxcbiAgICAgIChyZXF1ZXN0OiBodHRwLkluY29taW5nTWVzc2FnZSwgc29ja2V0OiBuZXQuU29ja2V0LCBoZWFkOiBCdWZmZXIpID0+IHtcbiAgICAgICAgY29uc3QgcGFyc2VkVXJsID0gdXJsLnBhcnNlKHJlcXVlc3QudXJsIHx8ICcnLCB0cnVlKTtcbiAgICAgICAgY29uc3QgdXJscGF0aCA9IHBhcnNlZFVybC5wYXRobmFtZSB8fCAnJztcbiAgICAgICAgY29uc3QgcHJveHlQb3J0ID0gcmV2ZXJzZVByb3h5LmdldFJlcXVlc3RQb3J0KHVybHBhdGgpO1xuICAgICAgICBpZiAocHJveHlQb3J0ICYmIHByb3h5UG9ydCAhPT0gcmVxdWVzdC5zb2NrZXQubG9jYWxQb3J0KSB7XG4gICAgICAgICAgcmV2ZXJzZVByb3h5LmhhbmRsZVVwZ3JhZGUocmVxdWVzdCwgc29ja2V0LCBoZWFkLCBwcm94eVBvcnQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVxdWVzdC51cmwgPT09ICcvY29sYWIvdHR5Jykge1xuICAgICAgICAgIFdlYlNvY2tldFRvUHR5KHJlcXVlc3QsIHNvY2tldCwgaGVhZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXF1ZXN0LnVybCA9PT0gJy9jb2xhYi9kYXAnKSB7XG4gICAgICAgICAgZGFwU2VydmVyPy5oYW5kbGVVcGdyYWRlKHJlcXVlc3QsIHNvY2tldCwgaGVhZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXF1ZXN0LnVybCA9PT0gJy9jb2xhYi9sc3AnKSB7XG4gICAgICAgICAgV2ViU29ja2V0VG9Mc3AoXG4gICAgICAgICAgICAgIHJlcXVlc3QsIHNvY2tldCwgaGVhZCwgX19kaXJuYW1lLCBjb250ZW50RGlyLCBsb2dzRGlyLCBwaXBMb2dzRGlyLFxuICAgICAgICAgICAgICBzZXR0aW5ncy5sYW5ndWFnZVNlcnZlclByb3h5LCBzZXR0aW5ncy5sYW5ndWFnZVNlcnZlclByb3h5QXJncyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGp1cHl0ZXIuaGFuZGxlU29ja2V0KHJlcXVlc3QsIHNvY2tldCwgaGVhZCk7XG4gICAgICB9KTtcblxuXG4gIGxvZ2dpbmcuZ2V0TG9nZ2VyKCkuaW5mbyhcbiAgICAgICdTdGFydGluZyBzZXJ2ZXIgYXQgaHR0cDovL2xvY2FsaG9zdDolZCcsIHNldHRpbmdzLnNlcnZlclBvcnQpO1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiBwcm9jZXNzLmV4aXQoKSk7XG4gIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgcG9ydDogc2V0dGluZ3Muc2VydmVyUG9ydCxcbiAgICBpcHY2T25seTogZmFsc2UsXG4gICAgaG9zdDogc2V0dGluZ3Muc2VydmVySG9zdCB8fCAnJ1xuICB9O1xuICBpZiAoJ1RFU1RfVE1QRElSJyBpbiBwcm9jZXNzLmVudikge1xuICAgIC8vIFJlcXVpcmVkIHRvIGF2b2lkIFwiRUFGTk9TVVBQT1JUOiBhZGRyZXNzIGZhbWlseSBub3Qgc3VwcG9ydGVkXCIgb25cbiAgICAvLyBJUHY2LW9ubHkgZW52aXJvbm1lbnRzIChub3RhYmx5LCBldmVuIHdpdGggdGhlIGhvc3Qgb3ZlcnJpZGUgYmVsb3cpLlxuICAgIG9wdGlvbnNbJ2lwdjZPbmx5J10gPSB0cnVlO1xuICAgIC8vIGlwdjZPbmx5IGFsb25lIGlzbid0IGVub3VnaCB0byBhdm9pZCBhdHRlbXB0aW5nIHRvIGJpbmQgdG8gMC4wLjAuMCAod2hpY2hcbiAgICAvLyBmYWlscyBvbiBJUHY2LW9ubHkgZW52aXJvbm1lbnRzKS4gIE5lZWQgdG8gc3BlY2lmeSBhbiBJUCBhZGRyZXNzIGJlY2F1c2VcbiAgICAvLyBETlMgcmVzb2x1dGlvbiBldmVuIG9mIGlwNi1sb2NhbGhvc3QgZmFpbHMgb24gc29tZSBzdWNoIGVudmlyb25tZW50cy5cbiAgICBvcHRpb25zWydob3N0J10gPSAnOjoxJztcbiAgfVxuICBzZXJ2ZXIubGlzdGVuKG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIFN0b3BzIHRoZSBzZXJ2ZXIgYW5kIGFzc29jaWF0ZWQgSnVweXRlciBzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdG9wKCk6IHZvaWQge1xuICBqdXB5dGVyLmNsb3NlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlYWRHY2VQcm9qZWN0SWQoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgbGV0IG1ldGFkYXRhSG9zdCA9ICdtZXRhZGF0YS5nb29nbGUuaW50ZXJuYWwnO1xuICBsZXQgcG9ydDogdW5kZWZpbmVkfG51bWJlciA9IHVuZGVmaW5lZDtcbiAgaWYgKHByb2Nlc3MuZW52WydHQ0VfTUVUQURBVEFfSE9TVCddKSB7XG4gICAgbWV0YWRhdGFIb3N0ID0gcHJvY2Vzcy5lbnZbJ0dDRV9NRVRBREFUQV9IT1NUJ107XG4gICAgY29uc3QgcG9ydFBhcnRzID0gbWV0YWRhdGFIb3N0Lm1hdGNoKC8oLiopOihcXGQrKS8pO1xuICAgIGlmIChwb3J0UGFydHMpIHtcbiAgICAgIG1ldGFkYXRhSG9zdCA9IHBvcnRQYXJ0c1sxXTtcbiAgICAgIGlmIChtZXRhZGF0YUhvc3Quc3RhcnRzV2l0aCgnWycpKSB7XG4gICAgICAgIG1ldGFkYXRhSG9zdCA9IG1ldGFkYXRhSG9zdC5zdWJzdHJpbmcoMSwgbWV0YWRhdGFIb3N0Lmxlbmd0aCAtIDEpO1xuICAgICAgfVxuICAgICAgcG9ydCA9IE51bWJlcihwb3J0UGFydHNbMl0pO1xuICAgIH1cbiAgfVxuICBjb25zdCBwcm9qZWN0SWQgPSBhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBodHRwLmdldChcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgaG9zdG5hbWU6IG1ldGFkYXRhSG9zdCxcbiAgICAgICAgICAgICAgcG9ydCxcbiAgICAgICAgICAgICAgcGF0aDogJy9jb21wdXRlTWV0YWRhdGEvdjEvcHJvamVjdC9wcm9qZWN0LWlkJyxcbiAgICAgICAgICAgICAgaGVhZGVyczogeydNZXRhZGF0YS1GbGF2b3InOiAnR29vZ2xlJ31cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgbGV0IGRhdGEgPSAnJztcbiAgICAgICAgICAgICAgcmVzcG9uc2Uub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgICAgICBkYXRhICs9IGNodW5rO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmVzcG9uc2Uub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpXG4gICAgICAgIC5lbmQoKTtcbiAgfSk7XG4gIHJldHVybiBwcm9qZWN0SWQudHJpbSgpO1xufVxuIl19