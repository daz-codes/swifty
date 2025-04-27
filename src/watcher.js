import chokidar from 'chokidar';
import { exec } from 'child_process';

// Define which files to watch (you can adjust based on your project structure)
const filesToWatch = [
    'pages/**/*.{md,html}',        // Watch JavaScript and HTML files in pages directory
    'layouts/**/*.{html}',      // Watch JavaScript and HTML files in layouts directory
    'images/**/*',                 // Watch all files in images directory
    'css/**/*.{css}',              // Watch CSS files in css directory
    'js/**/*.{js}',                // Watch JS files in js directory
    'partials/**/*.{md,html}',     // Watch JavaScript and HTML files in partials directory
    'template.html',                   // Watch the template HTML file
    'config.yaml', 'config.yml', 'config.json'  // Watch YAML and JSON config files
  ];
const buildScript = 'npm run build';  // Your build script command

// Initialize watcher
const watcher = chokidar.watch(filesToWatch, {
    persistent: true,
    debounceDelay: 200  // Wait 200ms after the last change to trigger the build
  })

// Event listener for file changes
watcher.on('change', path => {
  console.log(`File ${path} has been changed. Running build...`);
  exec(buildScript, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing build: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(stdout);  // Output from build process
  });
});

console.log(`Watching files for changes ...`);
