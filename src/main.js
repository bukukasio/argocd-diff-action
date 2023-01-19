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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
exports.__esModule = true;
var core = require("@actions/core");
var tc = require("@actions/tool-cache");
var child_process_1 = require("child_process");
var github = require("@actions/github");
var fs = require("fs");
var path = require("path");
var node_fetch_1 = require("node-fetch");
var http_errors_1 = require("http-errors");
var ARCH = process.env.ARCH || 'linux';
var githubToken = core.getInput('github-token');
core.info(githubToken);
var ARGOCD_SERVER_URL = core.getInput('argocd-server-url');
var ARGOCD_TOKEN = core.getInput('argocd-token');
var VERSION = core.getInput('argocd-version');
var EXTRA_CLI_ARGS = core.getInput('argocd-extra-cli-args');
var ARGOCD_ENV = core.getInput('argocd-env');
var octokit = github.getOctokit(githubToken);
function execCommand(command, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var p;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    p = new Promise(function (done, failed) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            (0, child_process_1.exec)(command, options, function (err, stdout, stderr) {
                                var res = {
                                    stdout: stdout,
                                    stderr: stderr
                                };
                                if (err) {
                                    res.err = err;
                                    failed(res);
                                    return;
                                }
                                done(res);
                            });
                            return [2 /*return*/];
                        });
                    }); });
                    return [4 /*yield*/, p];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function scrubSecrets(input) {
    var output = input;
    var authTokenMatches = input.match(/--auth-token=([\w.\S]+)/);
    if (authTokenMatches) {
        output = output.replace(new RegExp(authTokenMatches[1], 'g'), '***');
    }
    return output;
}
function setupArgoCDCommand() {
    return __awaiter(this, void 0, void 0, function () {
        var argoBinaryPath;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    argoBinaryPath = 'bin/argo';
                    return [4 /*yield*/, tc.downloadTool("https://github.com/argoproj/argo-cd/releases/download/".concat(VERSION, "/argocd-").concat(ARCH, "-amd64"), argoBinaryPath)];
                case 1:
                    _a.sent();
                    fs.chmodSync(path.join(argoBinaryPath), '755');
                    // core.addPath(argoBinaryPath);
                    return [2 /*return*/, function (params) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                return [2 /*return*/, execCommand("".concat(argoBinaryPath, " ").concat(params, " --auth-token=").concat(ARGOCD_TOKEN, " --server=").concat(ARGOCD_SERVER_URL, " ").concat(EXTRA_CLI_ARGS))];
                            });
                        }); }];
            }
        });
    });
}
function getApps() {
    return __awaiter(this, void 0, void 0, function () {
        var changedPaths, changedFiles, url, responseJson, response, e_1, _a, owner, repo, errorMessage, apps, pathToAppName, changedAppNames;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    changedPaths = [];
                    // Check if the workflow is triggered by a pull request event
                    if (!github.context.payload.pull_request) {
                        core.error('Error: This workflow should be triggered by a pull request event.');
                        return [2 /*return*/, []];
                    }
                    changedFiles = github.context.payload.pull_request.changed_files;
                    // Map the list of changed files to a list of changed paths
                    changedPaths = changedFiles.map(function (file) { return file.filename; });
                    url = "https://".concat(ARGOCD_SERVER_URL, "/api/v1/applications?fields=items.metadata.name,items.spec.source.path,items.spec.source.repoURL,items.spec.source.targetRevision,items.spec.source.helm,items.spec.source.kustomize,items.status.sync.status");
                    core.info("Fetching apps from: ".concat(url));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, (0, node_fetch_1["default"])(url, {
                            method: 'GET',
                            headers: { Cookie: "argocd.token=".concat(ARGOCD_TOKEN) }
                        })];
                case 2:
                    response = _b.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    responseJson = _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _b.sent();
                    if (e_1 instanceof http_errors_1.HttpError && e_1.message === 'Body is too long (maximum is 65536 characters)') {
                        core.error('Error: Body of HTTP request is too long.');
                        _a = github.context.repo, owner = _a.owner, repo = _a.repo;
                        errorMessage = "**Error:** Body of HTTP request is too long in ".concat(ARGOCD_ENV, " diff. Please check the details of your GitHub Actions workflow.");
                        octokit.rest.issues.createComment({
                            issue_number: github.context.issue.number,
                            owner: owner,
                            repo: repo,
                            body: errorMessage
                        });
                        process.exit(1);
                    }
                    throw e_1;
                case 5:
                    apps = responseJson.items.filter(function (app) {
                        return (app.spec.source.repoURL.includes("".concat(github.context.repo.owner, "/").concat(github.context.repo.repo)) && (app.spec.source.targetRevision === 'master' || app.spec.source.targetRevision === 'main'));
                    });
                    pathToAppName = {};
                    apps.forEach(function (app) {
                        var pathToAppName = {};
                        pathToAppName[app.spec.source.path] = app.metadata.name;
                    });
                    changedAppNames = changedPaths.map(function (path) { return pathToAppName[path]; });
                    return [2 /*return*/, apps.filter(function (app) { return changedAppNames.includes(app.metadata.name); })];
            }
        });
    });
}
function postDiffComment(diffs) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var _c, owner, repo, sha, commitLink, shortCommitSha, diffOutput, output, commentsResponse, existingComment;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _c = github.context.repo, owner = _c.owner, repo = _c.repo;
                    sha = (_b = (_a = github.context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.head) === null || _b === void 0 ? void 0 : _b.sha;
                    commitLink = "https://github.com/".concat(owner, "/").concat(repo, "/pull/").concat(github.context.issue.number, "/commits/").concat(sha);
                    shortCommitSha = String(sha).substr(0, 7);
                    diffOutput = diffs.map(function (_a) {
                        var app = _a.app, diff = _a.diff, error = _a.error;
                        return "\nApp: [`".concat(app.metadata.name, "`](https://").concat(ARGOCD_SERVER_URL, "/applications/").concat(app.metadata.name, ")\nYAML generation: ").concat(error ? ' Error 🛑' : 'Success 🟢', "\nApp sync status: ").concat(app.status.sync.status === 'Synced' ? 'Synced ✅' : 'Out of Sync ⚠️ ', "\n").concat(error
                            ? "\n**`stderr:`**\n```\n".concat(error.stderr, "\n```\n\n**`command:`**\n```json\n").concat(JSON.stringify(error.err), "\n```\n")
                            : '', "\n\n").concat(diff
                            ? "\n<details>\n\n```diff\n".concat(diff, "\n```\n\n</details>\n")
                            : '', "\n---\n");
                    });
                    output = scrubSecrets("\n## ArgoCD Diff for ".concat(ARGOCD_ENV, " commit [`").concat(shortCommitSha, "`](").concat(commitLink, ")\n_Updated at ").concat(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }), " IST_\n  ").concat(diffOutput.join('\n'), "\n\n| Legend | Status |\n| :---:  | :---   |\n| \u2705     | The app is synced in ArgoCD, and diffs you see are solely from this PR. |\n| \u26A0\uFE0F      | The app is out-of-sync in ArgoCD, and the diffs you see include those changes plus any from this PR. |\n| \uD83D\uDED1     | There was an error generating the ArgoCD diffs due to changes in this PR. |\n"));
                    return [4 /*yield*/, octokit.rest.issues.listComments({
                            issue_number: github.context.issue.number,
                            owner: owner,
                            repo: repo
                        })];
                case 1:
                    commentsResponse = _d.sent();
                    existingComment = commentsResponse.data.find(function (d) { return typeof d.body === 'string' && d.body.includes("ArgoCD Diff for ".concat(ARGOCD_ENV)); });
                    // Existing comments should be updated even if there are no changes this round in order to indicate that
                    if (existingComment) {
                        octokit.rest.issues.updateComment({
                            owner: owner,
                            repo: repo,
                            comment_id: existingComment.id,
                            body: output
                        });
                        // Only post a new comment when there are changes
                    }
                    else if (diffs.length) {
                        octokit.rest.issues.createComment({
                            issue_number: github.context.issue.number,
                            owner: owner,
                            repo: repo,
                            body: output
                        });
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function asyncForEach(array, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var index;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    index = 0;
                    _a.label = 1;
                case 1:
                    if (!(index < array.length)) return [3 /*break*/, 4];
                    return [4 /*yield*/, callback(array[index], index, array)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    index++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var argocd, apps, diffs, diffsWithErrors;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setupArgoCDCommand()];
                case 1:
                    argocd = _a.sent();
                    return [4 /*yield*/, getApps()];
                case 2:
                    apps = _a.sent();
                    core.info("Found apps: ".concat(apps.map(function (a) { return a.metadata.name; }).join(', ')));
                    diffs = [];
                    return [4 /*yield*/, asyncForEach(apps, function (app) { return __awaiter(_this, void 0, void 0, function () {
                            var command, e_2, res;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        command = "app diff ".concat(app.metadata.name, " --server-side-generate");
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        core.info("Running: argocd ".concat(command));
                                        // ArgoCD app diff will exit 1 if there is a diff, so always catch,
                                        // and then consider it a success if there's a diff in stdout
                                        // https://github.com/argoproj/argo-cd/issues/3588
                                        return [4 /*yield*/, argocd(command)];
                                    case 2:
                                        // ArgoCD app diff will exit 1 if there is a diff, so always catch,
                                        // and then consider it a success if there's a diff in stdout
                                        // https://github.com/argoproj/argo-cd/issues/3588
                                        _a.sent();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        e_2 = _a.sent();
                                        res = e_2;
                                        core.info("stdout: ".concat(res.stdout));
                                        core.info("stderr: ".concat(res.stderr));
                                        if (res.stdout) {
                                            diffs.push({ app: app, diff: res.stdout });
                                        }
                                        else {
                                            diffs.push({
                                                app: app,
                                                diff: '',
                                                error: e_2
                                            });
                                        }
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, postDiffComment(diffs)];
                case 4:
                    _a.sent();
                    diffsWithErrors = diffs.filter(function (d) { return d.error; });
                    if (diffsWithErrors.length) {
                        core.setFailed("ArgoCD diff failed: Encountered ".concat(diffsWithErrors.length, " errors"));
                    }
                    return [2 /*return*/];
            }
        });
    });
}
run()["catch"](function (e) { return core.setFailed(e.message); });
