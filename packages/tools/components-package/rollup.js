const babel = require("rollup-plugin-babel");
const process = require("process");
const resolve = require("rollup-plugin-node-resolve");
const url = require("rollup-plugin-url");
const { terser } = require("rollup-plugin-terser");
const notify = require('rollup-plugin-notify');
const filesize = require('rollup-plugin-filesize');
const livereload = require('rollup-plugin-livereload');
const os = require("os");
const fs = require("fs");
const ip = require("ip");

const packageName = JSON.parse(fs.readFileSync("./package.json")).name;
const DEPLOY_PUBLIC_PATH = process.env.DEPLOY_PUBLIC_PATH || "";

function ui5DevImportCheckerPlugin() {
	return {
		name: "ui5-dev-import-checker-plugin",
		transform(code, file) {
			const re = new RegExp(`^import.*"${packageName}/`);
			if (re.test(code)) {
				throw new Error(`illegal import in ${file}`);
			}
		}
	};
}

const getPlugins = ({ transpile }) => {
	const plugins = [];
	let publicPath = DEPLOY_PUBLIC_PATH || `http://${ip.address()}:8080/resources/`;


	if (!process.env.DEV) {
		plugins.push(filesize({
			render : function (options, bundle, { minSize, gzipSize, brotliSize, bundleSize }){
				return gzipSize;
			}
		}));
	}

	plugins.push(ui5DevImportCheckerPlugin());

	plugins.push(url({
		limit: 0,
		include: [
			/.*assets\/.*\.json/
		],
		emitFiles: true,
		fileName: "[name].[hash][extname]",
		publicPath,
	}));


	if (transpile) {
		plugins.push(babel({
			presets: ["@babel/preset-env"],
			exclude: "node_modules/**",
			sourcemap: true,
		}));
	}

	plugins.push(resolve());

	if (!process.env.DEV) {
		plugins.push(terser());
	}

	if (process.env.DEV) {
		plugins.push(notify());
	}

	const es6DevMain = process.env.DEV && !transpile && packageName === "@ui5/webcomponents";
	if (es6DevMain && os.platform() !== "win32") {
		plugins.push(livereload({
			watch: [
				"dist/resources/bundle.esm.js",
				"dist/**/*.html",
				"dist/**/*.json",
			]
		}));
	}

	return plugins;
};

const getES6Config = () => {
	return [{
		input: "bundle.esm.js",
		output: {
			dir: "dist/resources",
			format: "esm",
			sourcemap: true
		},
		moduleContext: (id) => {
			if (id.includes("url-search-params-polyfill")) {
				// suppress the rollup error for this module as it uses this in the global scope correctly even without changing the context here
				return "window";
			}
		},
		watch: {
			clearScreen: false
		},
		plugins: getPlugins({transpile: false}),
	}];
};

const getES5Config = () => {
	return [ {
		input: "bundle.es5.js",
		output: {
			dir: "dist/resources",
			format: "iife",
			name: "sap-ui-webcomponents-bundle",
			extend: "true",	// Whether or not to extend the global variable defined by the name option in umd or iife formats.
			sourcemap: true
		},
		moduleContext: (id) => {
			if (id.includes("url-search-params-polyfill")) {
				// suppress the rollup error for this module as it uses this in the global scope correctly even without changing the context here
				return "window";
			}
		},
		watch: {
			clearScreen: false
		},
		plugins: getPlugins({transpile: true}),
	}];
};

let config = getES6Config();

if (process.env.ES5_BUILD) {
	config = config.concat(getES5Config());
}

module.exports = config;