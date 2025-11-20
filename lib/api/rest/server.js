/**
 * REST API Server
 * v3.0.0 - API infrastructure
 *
 * Responsibilities:
 * - HTTP server for Context Manager API
 * - RESTful endpoints
 * - WebSocket support for watch mode
 * - Authentication (optional)
 */

import http from 'http';
import path from 'path';
import { URL } from 'url';
import { getLogger } from '../../utils/logger.js';
import Scanner from '../../core/Scanner.js';
import Analyzer from '../../core/Analyzer.js';
import ContextBuilder from '../../core/ContextBuilder.js';
import Reporter from '../../core/Reporter.js';
import GitClient from '../../integrations/git/GitClient.js';
import DiffAnalyzer from '../../integrations/git/DiffAnalyzer.js';
import { PresetManager } from '../../presets/preset-manager.js';
import { TokenBudgetFitter } from '../../optimizers/token-budget-fitter.js';
import { RuleTracer } from '../../debug/rule-tracer.js';

const logger = getLogger('APIServer');

export class APIServer {
  constructor(options = {}) {
    this.options = {
      port: 3000,
      host: 'localhost',
      authToken: null,
      cors: true,
      ...options
    };

    this.server = null;
    this.isRunning = false;
  }

  /**
   * Start API server
   */
  start() {
    if (this.isRunning) {
      logger.warn('Server already running');
      return;
    }

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(this.options.port, this.options.host, () => {
      this.isRunning = true;
      logger.info(`API Server started: http://${this.options.host}:${this.options.port}`);
      console.log(`\n🌐 Context Manager API Server`);
      console.log(`   Listening on: http://${this.options.host}:${this.options.port}`);
      console.log(`   API Version: v1`);
      console.log(`   Documentation: http://${this.options.host}:${this.options.port}/api/v1/docs`);
      console.log();
    });

    this.server.on('error', (error) => {
      logger.error(`Server error: ${error.message}`);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${this.options.port} is already in use`);
        console.error(`   Try a different port: context-manager serve --port 3001`);
      }
    });
  }

  /**
   * Stop API server
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.server.close(() => {
      this.isRunning = false;
      logger.info('API Server stopped');
      console.log('\n✅ Server stopped');
    });
  }

  /**
   * Handle HTTP request
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   */
  async handleRequest(req, res) {
    // CORS headers
    if (this.options.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
    }

    // Authentication
    if (this.options.authToken && !this.checkAuth(req)) {
      this.sendError(res, 401, 'Unauthorized');
      return;
    }

    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    logger.debug(`${req.method} ${pathname}`);

    try {
      // Route to handlers
      if (pathname.startsWith('/api/v1')) {
        await this.handleAPIv1(req, res, pathname, url);
      } else {
        this.sendError(res, 404, 'Not Found');
      }
    } catch (error) {
      logger.error(`Request error: ${error.message}`);
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * Handle API v1 routes
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   * @param {string} pathname
   * @param {URL} url
   */
  async handleAPIv1(req, res, pathname, url) {
    // GET /api/v1/analyze
    if (pathname === '/api/v1/analyze' && req.method === 'GET') {
      await this.handleAnalyze(req, res, url);
      return;
    }

    // GET /api/v1/methods
    if (pathname === '/api/v1/methods' && req.method === 'GET') {
      await this.handleMethods(req, res, url);
      return;
    }

    // GET /api/v1/stats
    if (pathname === '/api/v1/stats' && req.method === 'GET') {
      await this.handleStats(req, res, url);
      return;
    }

    // GET /api/v1/diff
    if (pathname === '/api/v1/diff' && req.method === 'GET') {
      await this.handleDiff(req, res, url);
      return;
    }

    // POST /api/v1/context
    if (pathname === '/api/v1/context' && req.method === 'POST') {
      await this.handleContext(req, res);
      return;
    }

    // GET /api/v1/presets
    if (pathname === '/api/v1/presets' && req.method === 'GET') {
      await this.handlePresetsList(req, res);
      return;
    }

    // GET /api/v1/presets/:name
    if (pathname.startsWith('/api/v1/presets/') && req.method === 'GET') {
      const presetName = pathname.replace('/api/v1/presets/', '');
      await this.handlePresetInfo(req, res, presetName);
      return;
    }

    // GET /api/v1/docs
    if (pathname === '/api/v1/docs' && req.method === 'GET') {
      this.handleDocs(req, res);
      return;
    }

    this.sendError(res, 404, 'Endpoint not found');
  }

  /**
   * Handle /api/v1/analyze endpoint
   */
  async handleAnalyze(req, res, url) {
    const params = Object.fromEntries(url.searchParams);
    const projectPath = params.path || process.cwd();

    const scanner = new Scanner(projectPath);
    const files = scanner.scan();

    const analyzer = new Analyzer({ methodLevel: params.methods === 'true' });
    const result = await analyzer.analyze(files);

    this.sendJSON(res, result);
  }

  /**
   * Handle /api/v1/methods endpoint
   */
  async handleMethods(req, res, url) {
    const params = Object.fromEntries(url.searchParams);
    const filePath = params.file;

    if (!filePath) {
      this.sendError(res, 400, 'Missing "file" parameter');
      return;
    }

    // Analyze single file
    const analyzer = new Analyzer({ methodLevel: true });
    const fileInfo = {
      path: filePath,
      relativePath: filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath)
    };

    const analysis = await analyzer.analyzeFile(fileInfo);

    this.sendJSON(res, {
      file: filePath,
      methods: analysis.methods || [],
      totalMethods: analysis.methodCount || 0
    });
  }

  /**
   * Handle /api/v1/stats endpoint
   */
  async handleStats(req, res, url) {
    const params = Object.fromEntries(url.searchParams);
    const projectPath = params.path || process.cwd();

    const scanner = new Scanner(projectPath);
    const files = scanner.scan();

    const analyzer = new Analyzer();
    const result = await analyzer.analyze(files);

    this.sendJSON(res, result.stats);
  }

  /**
   * Handle /api/v1/diff endpoint
   */
  async handleDiff(req, res, url) {
    const params = Object.fromEntries(url.searchParams);
    const projectPath = params.path || process.cwd();
    const since = params.since || null;

    const diffAnalyzer = new DiffAnalyzer(projectPath);
    const analysis = diffAnalyzer.analyzeChanges(since);

    this.sendJSON(res, analysis);
  }

  /**
   * Handle /api/v1/context endpoint (POST)
   */
  async handleContext(req, res) {
    const body = await this.parseBody(req);

    const projectPath = body.path || process.cwd();
    const options = {
      methodLevel: body.methodLevel || false,
      targetModel: body.targetModel || null,
      targetTokens: body.targetTokens || null,
      useCase: body.useCase || 'custom'
    };

    let appliedPreset = null;
    let ruleTracer = null;

    try {
      // Apply preset if specified
      if (body.preset && body.preset !== 'none') {
        const presetManager = new PresetManager();
        appliedPreset = presetManager.applyPreset(body.preset, projectPath);
        
        // Merge preset options with request options (request takes precedence)
        if (appliedPreset.options.targetTokens && !body.targetTokens) {
          options.targetTokens = appliedPreset.options.targetTokens;
        }
        if (appliedPreset.options.methodLevel && !body.methodLevel) {
          options.methodLevel = appliedPreset.options.methodLevel;
        }
      }

      // Enable rule tracing if requested
      if (body.traceRules === true) {
        ruleTracer = new RuleTracer();
        ruleTracer.enable();
      }

      // Build context
      const scanner = new Scanner(projectPath);
      const files = scanner.scan();

      const analyzer = new Analyzer(options);
      let result = await analyzer.analyze(files);

      // Apply token budget fitting if specified
      if (body.targetTokens || options.targetTokens) {
        const targetTokens = body.targetTokens || options.targetTokens;
        const fitStrategy = body.fitStrategy || 'auto';
        
        const fitter = new TokenBudgetFitter(targetTokens, fitStrategy);
        const fitResult = fitter.fitToWindow(result.files, {
          preserveEntryPoints: true
        });

        // Update result with fitted files
        result.files = fitResult.files;
        result.fitReport = fitter.generateReport(fitResult);
      }

      const builder = new ContextBuilder(options);
      const context = builder.build(result);

      // Add trace information if enabled
      if (ruleTracer && ruleTracer.isEnabled()) {
        context.trace = ruleTracer.generateReport();
      }

      // Add preset information if applied
      if (appliedPreset) {
        context.preset = {
          id: appliedPreset.presetId,
          applied: true
        };
      }

      this.sendJSON(res, context);

    } finally {
      // Cleanup preset files if applied
      if (appliedPreset) {
        const presetManager = new PresetManager();
        presetManager.cleanup(appliedPreset);
      }
    }
  }

  /**
   * Handle /api/v1/presets endpoint (GET)
   */
  async handlePresetsList(req, res) {
    try {
      const presetManager = new PresetManager();
      const presets = presetManager.listPresets();
      
      this.sendJSON(res, {
        presets: presets,
        total: presets.length
      });
    } catch (error) {
      logger.error(`Failed to list presets: ${error.message}`);
      this.sendError(res, 500, `Failed to list presets: ${error.message}`);
    }
  }

  /**
   * Handle /api/v1/presets/:name endpoint (GET)
   */
  async handlePresetInfo(req, res, presetName) {
    try {
      const presetManager = new PresetManager();
      const preset = presetManager.getPresetInfo(presetName);
      
      if (!preset) {
        this.sendError(res, 404, `Preset "${presetName}" not found`);
        return;
      }
      
      this.sendJSON(res, preset);
    } catch (error) {
      logger.error(`Failed to get preset info: ${error.message}`);
      this.sendError(res, 500, `Failed to get preset info: ${error.message}`);
    }
  }

  /**
   * Handle /api/v1/docs endpoint
   */
  handleDocs(req, res) {
    const docs = {
      version: 'v1',
      endpoints: [
        {
          path: '/api/v1/analyze',
          method: 'GET',
          description: 'Analyze project files and get token counts',
          parameters: {
            path: 'Project path (optional, defaults to cwd)',
            methods: 'Include method-level analysis (true/false)'
          }
        },
        {
          path: '/api/v1/methods',
          method: 'GET',
          description: 'Extract methods from a file',
          parameters: {
            file: 'File path (required)'
          }
        },
        {
          path: '/api/v1/stats',
          method: 'GET',
          description: 'Get project statistics',
          parameters: {
            path: 'Project path (optional)'
          }
        },
        {
          path: '/api/v1/diff',
          method: 'GET',
          description: 'Analyze git diff',
          parameters: {
            path: 'Project path (optional)',
            since: 'Git reference (optional, e.g., "main", "HEAD~5")'
          }
        },
        {
          path: '/api/v1/presets',
          method: 'GET',
          description: 'List all available presets',
          parameters: {}
        },
        {
          path: '/api/v1/presets/:name',
          method: 'GET',
          description: 'Get detailed information about a specific preset',
          parameters: {
            name: 'Preset ID or name (required)'
          }
        },
        {
          path: '/api/v1/context',
          method: 'POST',
          description: 'Generate optimized LLM context with preset and token budget support',
          body: {
            path: 'Project path',
            methodLevel: 'Include methods (boolean)',
            targetModel: 'Target LLM model',
            targetTokens: 'Target token budget (number)',
            fitStrategy: 'Token fitting strategy (auto, shrink-docs, methods-only, top-n, balanced)',
            preset: 'Preset ID to apply (string)',
            traceRules: 'Enable rule tracing (boolean)',
            useCase: 'Use case template'
          }
        }
      ]
    };

    this.sendJSON(res, docs);
  }

  /**
   * Check authentication
   * @param {http.IncomingMessage} req
   * @returns {boolean}
   */
  checkAuth(req) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return false;
    }

    const token = authHeader.replace('Bearer ', '');
    return token === this.options.authToken;
  }

  /**
   * Parse request body
   * @param {http.IncomingMessage} req
   * @returns {Promise<object>}
   */
  parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Send JSON response
   * @param {http.ServerResponse} res
   * @param {object} data
   * @param {number} statusCode
   */
  sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Send error response
   * @param {http.ServerResponse} res
   * @param {number} statusCode
   * @param {string} message
   */
  sendError(res, statusCode, message) {
    this.sendJSON(res, {
      error: message,
      statusCode: statusCode
    }, statusCode);
  }
}

export default APIServer;
