// Patch native-pack-tool files
const fs = require("fs");
const path = require("path");

const nptDir = process.argv[2];
if (!nptDir) {
  console.error("Usage: node patch-npt.js <native-pack-tool-dir>");
  process.exit(1);
}

function walkDir(dir, callback) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (item.isFile() && (item.name.endsWith(".js") || item.name.endsWith(".ts"))) {
      callback(fullPath);
    }
  }
}

let patched = 0;

walkDir(nptDir, (file) => {
  let c = fs.readFileSync(file, "utf8");
  let changed = false;

  // Patch replaceEnvVariables
  if (c.includes("replaceEnvVariables")) {
    const before = c;
    // 匹配多種函數定義方式：function declaration, function expression, class method, arrow function
    c = c.replace(/(replaceEnvVariables\s*[=:]\s*function\s*\((\w+)[^)]*\)\s*\{)/, "$1if(typeof $2==='undefined'||$2===null)return '';");
    c = c.replace(/(function\s+replaceEnvVariables\s*\((\w+)[^)]*\)\s*\{)/, "$1if(typeof $2==='undefined'||$2===null)return '';");
    c = c.replace(/(replaceEnvVariables\s*\((\w+)[^)]*\)\s*\{)/, "$1if(typeof $2==='undefined'||$2===null)return '';");
    c = c.replace(/(replaceEnvVariables\s*[=:]\s*\((\w+)[^)]*\)\s*=>\s*\{)/, "$1if(typeof $2==='undefined'||$2===null)return '';");
    if (c !== before) {
      changed = true;
      console.log("Patched replaceEnvVariables in " + file);
    } else {
      console.log("WARNING: replaceEnvVariables found but regex did not match in " + file);
      // 嘗試找到函數定義位置並輸出上下文
      const idx = c.indexOf("replaceEnvVariables");
      if (idx >= 0) {
        console.log("Context: " + c.substring(Math.max(0, idx-50), idx+100));
      }
    }
  }

  // Patch replaceEnvVariables call sites: 確保傳入值不為 undefined
  if (c.includes("replaceEnvVariables(")) {
    const before = c;
    // 只 patch 有物件前綴的呼叫，如 cchelper.replaceEnvVariables(xxx)
    c = c.replace(/(\.\s*replaceEnvVariables)\(([^)]+)\)/g, "$1($2||'')");
    if (c !== before) {
      changed = true;
      console.log("Patched replaceEnvVariables call sites in " + file);
    }
  }

  // Patch setOrientation and orientation access (only in android files)
  if (file.includes("android") && c.includes("setOrientation")) {
    const before = c;
    c = c.replace(/(setOrientation\s*\((\w+)[^)]*\)\s*\{)/, "$1$2=$2||{landscapeRight:true,landscapeLeft:true,portrait:false,upsideDown:false};");
    c = c.replace(/(\w+)\.landscapeRight/g, "($1||{}).landscapeRight");
    c = c.replace(/(\w+)\.landscapeLeft/g, "($1||{}).landscapeLeft");
    c = c.replace(/(\w+)\.portrait/g, "($1||{}).portrait");
    c = c.replace(/(\w+)\.upsideDown/g, "($1||{}).upsideDown");
    if (c !== before) {
      changed = true;
      console.log("Patched orientation in " + file);
    }
  }

  if (changed) {
    fs.writeFileSync(file, c, "utf8");
    patched++;
  }
});

console.log("Total patched: " + patched);
