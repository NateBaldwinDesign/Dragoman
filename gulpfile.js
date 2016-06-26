var jsonSass = require('gulp-json-sass'),
    jsonCss = require('gulp-json-css'),
    gulp = require('gulp'),
    concat = require('gulp-concat'),
    sass = require('gulp-sass'),
    clean = require('gulp-rimraf'),
    rename = require('gulp-rename'),
    replace = require('gulp-replace'),
    wrapper = require('gulp-wrapper'),
    data = require('gulp-data'),
    jsonTransform = require('gulp-json-transform'),
    ase = require('ase-util'),
    run = require('gulp-run'),
    pngquant = require('imagemin-pngquant'),
    svg2png = require('gulp-svg2png'),
    imagemin = require('gulp-imagemin'),
    svgstore = require('gulp-svgstore'),
    svgmin = require('gulp-svgmin'),
    cheerio = require('gulp-cheerio'),
    fs = require('fs'),
    concat = require('gulp-concat-util'),
    concat_json = require("gulp-concat-json"),
    beautify = require('gulp-beautify'),

    //===========================================//
    // Use Tokens in process
    //===========================================//
    // iconography = fs.readFileSync('./tokens/iconography.json'),
    iconography = './tokens/iconography.json',
    

    //===========================================//
    // SET THE PATH TO YOUR SOURCE & DESTINATION
    // FOR BUILD PROCESSES.
    // [1] Path to your source JSON files
    // [2] Path to distribute variable files
    //===========================================//
    pathToSource = 'tokens/',
    pathToDest = 'dest/';

//===========================================//
// Clean Build
gulp.task('clean-build', function() {
  gulp.src( pathToDest + '**/*.*').pipe(clean());
});
//===========================================//
// Convert JSON to SCSS variables
gulp.task('json-scss', ['clean-build'], function() {
  return gulp
    .src( pathToSource + '*.json')
    .pipe(jsonCss({
      targetPre: "scss",
      delim: "-"
    }))
    .pipe(rename({
      prefix: "_"
    }))
    .pipe(gulp.dest( pathToDest ));
});
//===========================================//
// Convert JSON to SASS variables
gulp.task('json-sass', ['json-scss'], function() {
  return gulp
    .src( pathToSource + '*.json')
    .pipe(jsonCss({
      targetPre: "sass",
      delim: "-"
    }))
    .pipe(rename({
      prefix: "_"
    }))
    .pipe(gulp.dest( pathToDest ));
});
//===========================================//
// Convert JSON to Less variables
gulp.task('json-less', ['json-sass'], function() {
  return gulp
    .src( pathToSource + '*.json')
    .pipe(jsonCss({
      targetPre: "less",
      delim: "-"
    }))
    .pipe(rename({
      prefix: "_"
    }))
    .pipe(gulp.dest( pathToDest ));
});
//===========================================//
// Convert JSON to Stylus variables
gulp.task('json-stylus', ['json-less'], function() {
  return gulp
    .src( pathToSource + '*.json')
    .pipe(jsonCss({
      targetPre: "sass",
      delim: "-"
    }))
    .pipe(replace('$', ''))
    .pipe(replace(':', ' ='))
    .pipe(rename({
      prefix: "_",
      extname: ".styl"
    }))
    .pipe(gulp.dest( pathToDest ));
});
//===========================================//
// Convert JSON to Android XML
gulp.task('json-android-dimensions', ['json-stylus'], function() {
  return gulp
    .src( pathToSource + '*.json')
    .pipe(jsonTransform(function(data) {
      return {
        base: data.base,
        whitespace: data.whitespace
      };
    }))
    .pipe(jsonCss({
      targetPre: "scss",
      delim: "-"
    }))
    .pipe(wrapper({
      header: '<?xml version="1.0" encoding="utf-8"?> \n<resources> \n',
      footer: '\n</resources> \n'
    }))
    .pipe(replace('$', '    <dimen name="'))
    .pipe(replace(': ', '">'))
    .pipe(replace(';', '</dimen>'))
    .pipe(rename('dimens-android.xml'))
    .pipe(gulp.dest( pathToDest ));
});
gulp.task('json-android-color', ['json-android-dimensions'], function() {
  return gulp
    .src( pathToSource + 'color.json')
    .pipe(jsonCss({
      targetPre: "scss",
      delim: "-"
    }))
    .pipe(wrapper({
      header: '<?xml version="1.0" encoding="utf-8"?> \n<resources> \n',
      footer: '\n</resources> \n'
    }))
    .pipe(replace('$', '    <color name="'))
    .pipe(replace(': ', '">'))
    .pipe(replace(';', '</color>'))
    .pipe(rename('colors-android.xml'))
    .pipe(gulp.dest( pathToDest ));
});

//===========================================//
// Convert JSON to ios JSON format
gulp.task('json-ios-color', ['json-android-color'], function() {
  return gulp
    // Convert JSON to Scss
    .src( pathToSource + 'color.json')
    .pipe(jsonCss({
      targetPre: "scss",
      delim: "-"
    }))
    // Replace characters to allow compiling 
    // valid CSS in order to convert HEX to RGBA
    .pipe(replace('$', 'div#'))
    .pipe(replace(': #', ' { background-color: rgba(#'))
    .pipe(replace(';', ', 0.999999999); }'))
    // Convert to CSS
    .pipe(sass())
    // Replace temporaty characters with strings
    // that will produce valid swift declarations
    .pipe(replace('div#', '  class func '))
    .pipe(replace(' {', '() -> UIColor {'))
    .pipe(replace('}', '\n  }'))
    .pipe(replace('  background-color: rgba(', '    return UIColor('))
    .pipe(replace('1)', 'alpha: 1)'))
    .pipe(replace(',', '.0/255.0,'))
    .pipe(replace('; }', ');\n}'))
    // Add wrapper with UIKit declarations
    .pipe(wrapper({
      header: 'import UIKit\nextension UIColor {\n',
      footer: '}\n'
    }))
    .pipe(rename('colors-ios.swift'))
    .pipe(gulp.dest( pathToDest ));
});
//===========================================//
// Transform .clr file into JSON ?

//===========================================//
// Create SVG symbol sprite

gulp.task('svg-optimize', function() {
  return gulp
    .src( pathToSource + '/**/*.svg')
    .pipe(svgmin({
        plugins: [{
          removeXMLProcInst: false
        }, {
          removeViewBox: false
        }, {
          removeStyleElement: true
        }, {
          removeAttrs: {
            attrs: ['id', 'path:fill', 'class']
          }
        }, {
          removeDimensions: true
        }, {
          removeTitle: true
        }]
      }))
    .pipe(gulp.dest( pathToDest + '/icons'))
});

gulp.task('svg-sprite', ['svg-optimize'], function() {
  return gulp
    .src([ pathToDest + '/icons/**/*.svg'], {
      base: '.'
    })
    .pipe(rename({
      prefix: 'icon-'
    }))
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(cheerio({
      run: function($) {
        $('svg').attr('style', 'display: none');
      },
      parserOptions: {
        xmlMode: true
      }
    }))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest( pathToDest + '/icons'))
});

//===========================================//
// Create PNG images at ios sizes

// resize original svg to control 1x scale
gulp.task('ios-resize', function() {
  return gulp.src( pathToDest + 'icons/svg/*.svg')
    // Use Gulp replace to add styles to SVG
    .pipe(replace('<svg ', '<svg fill="#ffffff" width="18px" height="" '))
    .pipe(gulp.dest('temp/18px'));
});
// convert at 1x
gulp.task('svg2png-1x', ['ios-resize'], function() {
  return gulp.src('temp/18px/**/*.svg')
    .pipe(svg2png(1, false, 20))
    .pipe(gulp.dest( pathToDest + '/icons/ios-1x'));
});
// convert at 2x
gulp.task('svg2png-2x', ['ios-resize'], function() {
  return gulp.src('temp/18px/**/*.svg')
    .pipe(svg2png(2, false, 20))
    .pipe(gulp.dest( pathToDest + '/icons/ios-2x'));
});
// convert at 3x
gulp.task('svg2png-3x', ['ios-resize'], function() {
  return gulp.src('temp/18px/**/*.svg')
    .pipe(svg2png(3, false, 20))
    .pipe(gulp.dest( pathToDest + '/icons/ios-3x'));
});
// Clean Build directory
gulp.task('ios-icons-resize', ['svg2png-1x', 'svg2png-2x', 'svg2png-3x'], function() {
  gulp.src(['temp']).pipe(clean());
});

gulp.task('ios-icons', ['ios-icons-resize'], function() {
  return gulp
    .src([ 
      pathToDest + '/icons/ios-1x',  
      pathToDest + '/icons/ios-2x',
      pathToDest + '/icons/ios-3x'])
    .pipe(imagemin({
      optimizationLevel: 6,
      use: [pngquant()]
    }))
    .pipe(gulp.dest( pathToDest + '/icons'));
});
//===========================================//
// Read JSON from .library
// function prefixScss() {
//   function transform(file, cb) {
//     var contents = file.contents.toString();
//     var lines = contents.split('\n');
//     for (var index in lines) {
//       var line = lines[index];
//       var regex = /\.(?!esg-)[a-z]+([_-]{1,2}[a-z]+)?/g //Checks if line contains class format
//       if (regex.test(line)) {
//         if (/^[ ]*(content|src)?:[ ]*url/.test(line)) break;
//         if (/^(input|fieldset|select|button|text-area|a|label|li|ol|p|ul|code|pre|xmp|h[1-6]|[&@>.\s#])/.test(line)) {
//           line = line.replace(regex, '.esg-$&'); //Replaces the class with .esg-{class}
//           line = line.replace(/\.esg-\./g, '.esg-'); //Removes the period from the beginning of the class
//           lines[index] = line;
//         }
//       }
//     }
//     contents = lines.join('\n');
//     file.contents = new Buffer(contents);
//     cb(null, file);
//   }
//   return eventStream.map(transform);
// }
// function removeMeta() {
//   function transform (file, cb) {
//     var contents = file.contents.toString();
//     var lines = contents.split('\n');
//     for (var index in lines) {
//       var line = lines[index];
//       line = line.replace(/\^"name"*)$/g, '');
//       lines[index] = line;
//     }
//   }
// }

gulp.task('json-test', function() {
  return gulp
    // Convert JSON to Scss
    .src('*.library/*.color/*.json')
    .pipe(concat_json('colors.js'))

    .pipe(replace('"r"', 'red'))
    .pipe(replace('"g"', 'green'))
    .pipe(replace('"b"', 'blue'))
    .pipe(replace('"a"', 'alpha'))
    .pipe(replace('{"', '\nclass func '))
    .pipe(replace('":{', '-temp() -> UIColor {\nreturn UIColor('))
    .pipe(replace('},', ')'))
    .pipe(beautify({indentSize: 2}))
    .pipe(replace(/"name"[^\n]*/g, '')) // removes all lines beginning with "name"

    .pipe(replace("[", ""))
    .pipe(replace("]", ""))

    .pipe(wrapper({
      header: 'import UIKit\nextension UIColor {',
      footer: '}\n'
    }))
    .pipe(rename('colors-ios-test.swift'))
    .pipe(gulp.dest( pathToDest ));
});
///////////

gulp.task('default', ['json-ios-color', 'svg-sprite', 'ios-icons']);
