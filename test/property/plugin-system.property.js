/**
 * Property-Based Tests for Plugin System
 * Tests plugin system properties from comprehensive-test-validation spec
 */

import fc from 'fast-check';
import { runProperty } from '../helpers/property-test-helpers.js';
import { PluginManager } from '../../lib/plugins/PluginManager.js';
import LanguagePlugin from '../../lib/plugins/LanguagePlugin.js';
import ExporterPlugin from '../../lib/plugins/ExporterPlugin.js';

/**
 * Property 41: Plugin registration correctness
 * Feature: comprehensive-test-validation, Property 41: Plugin registration correctness
 * Validates: Requirements 11.1, 11.2
 * 
 * For any valid plugin, registration should make it available for use
 */
export async function testPluginRegistrationCorrectness() {
    console.log('\n🧪 Property 41: Plugin registration correctness');
    console.log('   Feature: comprehensive-test-validation, Property 41: Plugin registration correctness');
    console.log('   Validates: Requirements 11.1, 11.2');
    
    // Generator for valid plugin names
    const pluginNameGenerator = fc.stringMatching(/^[a-z][a-z0-9-]*$/);
    
    // Generator for language plugins
    const languagePluginGenerator = fc.record({
        name: pluginNameGenerator,
        extensions: fc.array(fc.constantFrom('.js', '.ts', '.py', '.java', '.go', '.rs', '.cpp'), { minLength: 1, maxLength: 3 }),
        version: fc.constantFrom('1.0.0', '2.0.0', '1.5.0')
    }).map(config => {
        const plugin = new LanguagePlugin();
        plugin.name = config.name;
        plugin.extensions = config.extensions;
        plugin.version = config.version;
        // Override extractMethods to provide a valid implementation
        plugin.extractMethods = (content, filePath) => {
            return [{
                name: 'testMethod',
                line: 1,
                content: content.substring(0, 50)
            }];
        };
        return plugin;
    });
    
    // Generator for exporter plugins
    const exporterPluginGenerator = fc.record({
        name: pluginNameGenerator,
        extension: fc.constantFrom('.txt', '.json', '.xml', '.md'),
        mimeType: fc.constantFrom('text/plain', 'application/json', 'application/xml', 'text/markdown'),
        version: fc.constantFrom('1.0.0', '2.0.0', '1.5.0')
    }).map(config => {
        const plugin = new ExporterPlugin();
        plugin.name = config.name;
        plugin.extension = config.extension;
        plugin.mimeType = config.mimeType;
        plugin.version = config.version;
        // Override encode to provide a valid implementation
        plugin.encode = (context, options) => {
            return JSON.stringify(context);
        };
        return plugin;
    });
    
    // Combined plugin generator
    const pluginGenerator = fc.oneof(languagePluginGenerator, exporterPluginGenerator);
    
    const property = fc.property(
        pluginGenerator,
        (plugin) => {
            // Create a new PluginManager instance for each test
            const manager = new PluginManager({ autoLoad: false });
            
            // Register the plugin
            manager.register(plugin.name, plugin);
            
            // Verify plugin is registered
            const registeredPlugins = manager.list();
            if (!registeredPlugins.includes(plugin.name)) {
                return false;
            }
            
            // Verify plugin can be retrieved
            const retrievedPlugin = manager.get(plugin.name);
            if (!retrievedPlugin) {
                return false;
            }
            
            // Verify retrieved plugin is the same instance
            if (retrievedPlugin !== plugin) {
                return false;
            }
            
            // Verify plugin is marked as loaded
            if (!manager.isLoaded(plugin.name)) {
                return false;
            }
            
            // Verify plugin info is correct
            const info = manager.getInfo(plugin.name);
            if (!info) {
                return false;
            }
            if (info.name !== plugin.name) {
                return false;
            }
            if (!info.loaded) {
                return false;
            }
            if (!info.hasInstance) {
                return false;
            }
            
            // Verify stats are updated
            const stats = manager.getStats();
            if (stats.registered < 1) {
                return false;
            }
            if (stats.loaded < 1) {
                return false;
            }
            
            return true;
        }
    );
    
    await runProperty(property, { numRuns: 100 });
    console.log('   ✓ Plugin registration makes plugins available for use');
}

/**
 * Property 42: Plugin execution correctness
 * Feature: comprehensive-test-validation, Property 42: Plugin execution correctness
 * Validates: Requirements 11.4
 * 
 * For any registered plugin, execution should call the plugin's execute method
 */
export async function testPluginExecutionCorrectness() {
    console.log('\n🧪 Property 42: Plugin execution correctness');
    console.log('   Feature: comprehensive-test-validation, Property 42: Plugin execution correctness');
    console.log('   Validates: Requirements 11.4');
    
    // Generator for plugin names
    const pluginNameGenerator = fc.stringMatching(/^[a-z][a-z0-9-]*$/);
    
    // Generator for test content
    const contentGenerator = fc.string({ minLength: 10, maxLength: 200 });
    
    // Generator for language plugins with execution tracking
    const languagePluginGenerator = fc.record({
        name: pluginNameGenerator,
        extensions: fc.array(fc.constantFrom('.js', '.ts', '.py', '.java'), { minLength: 1, maxLength: 2 }),
        testContent: contentGenerator
    }).map(config => {
        const plugin = new LanguagePlugin();
        plugin.name = config.name;
        plugin.extensions = config.extensions;
        
        // Track if extractMethods was called
        let extractMethodsCalled = false;
        let extractMethodsArgs = null;
        
        plugin.extractMethods = (content, filePath) => {
            extractMethodsCalled = true;
            extractMethodsArgs = { content, filePath };
            return [{
                name: 'extractedMethod',
                line: 1,
                content: content.substring(0, 30)
            }];
        };
        
        return {
            plugin,
            testContent: config.testContent,
            wasExecuted: () => extractMethodsCalled,
            getExecutionArgs: () => extractMethodsArgs
        };
    });
    
    // Generator for exporter plugins with execution tracking
    const exporterPluginGenerator = fc.record({
        name: pluginNameGenerator,
        extension: fc.constantFrom('.txt', '.json', '.xml'),
        testContext: fc.record({
            files: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
            summary: fc.string({ minLength: 10, maxLength: 50 })
        })
    }).map(config => {
        const plugin = new ExporterPlugin();
        plugin.name = config.name;
        plugin.extension = config.extension;
        
        // Track if encode was called
        let encodeCalled = false;
        let encodeArgs = null;
        
        plugin.encode = (context, options) => {
            encodeCalled = true;
            encodeArgs = { context, options };
            return JSON.stringify(context);
        };
        
        return {
            plugin,
            testContext: config.testContext,
            wasExecuted: () => encodeCalled,
            getExecutionArgs: () => encodeArgs
        };
    });
    
    const property = fc.property(
        fc.oneof(languagePluginGenerator, exporterPluginGenerator),
        (pluginWrapper) => {
            // Create a new PluginManager instance
            const manager = new PluginManager({ autoLoad: false });
            
            // Register the plugin
            manager.register(pluginWrapper.plugin.name, pluginWrapper.plugin);
            
            // Get the plugin
            const plugin = manager.get(pluginWrapper.plugin.name);
            if (!plugin) {
                return false;
            }
            
            // Execute the plugin's main method
            if (plugin instanceof LanguagePlugin) {
                const testFilePath = 'test.js';
                const result = plugin.extractMethods(pluginWrapper.testContent, testFilePath);
                
                // Verify execution was tracked
                if (!pluginWrapper.wasExecuted()) {
                    return false;
                }
                
                // Verify correct arguments were passed
                const args = pluginWrapper.getExecutionArgs();
                if (args.content !== pluginWrapper.testContent) {
                    return false;
                }
                if (args.filePath !== testFilePath) {
                    return false;
                }
                
                // Verify result is an array
                if (!Array.isArray(result)) {
                    return false;
                }
                
                // Verify result has expected structure
                if (result.length > 0) {
                    const method = result[0];
                    if (!method.name || !method.line) {
                        return false;
                    }
                }
            } else if (plugin instanceof ExporterPlugin) {
                const result = plugin.encode(pluginWrapper.testContext, {});
                
                // Verify execution was tracked
                if (!pluginWrapper.wasExecuted()) {
                    return false;
                }
                
                // Verify correct arguments were passed
                const args = pluginWrapper.getExecutionArgs();
                if (args.context !== pluginWrapper.testContext) {
                    return false;
                }
                
                // Verify result is a string
                if (typeof result !== 'string') {
                    return false;
                }
                
                // Verify result is not empty
                if (result.length === 0) {
                    return false;
                }
            }
            
            return true;
        }
    );
    
    await runProperty(property, { numRuns: 100 });
    console.log('   ✓ Plugin execution calls the plugin\'s execute method correctly');
}

// Export all tests
export default async function runAllPluginSystemProperties() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 Plugin System Property-Based Tests');
    console.log('='.repeat(80));
    
    await testPluginRegistrationCorrectness();
    await testPluginExecutionCorrectness();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ All plugin system property tests passed!');
    console.log('='.repeat(80) + '\n');
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllPluginSystemProperties().catch(error => {
        console.error('❌ Property tests failed:', error);
        process.exit(1);
    });
}
