// Patch native-pack-tool files - 搜尋整個 cocos 目錄
const fs = require("fs");
const path = require("path");

const rootDir = process.argv[2];
if (!rootDir) {
  console.error("Usage: node patch-npt.js <root-dir>");
  process.exit(1);
}

function walkDir(dir, callback) {
  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) { return; }
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      // 跳過 node_modules
      if (item.name !== 'node_modules') {
        walkDir(fullPath, callback);
      }
    } else if (item.isFile() && (item.name.endsWith(".js") || item.name.endsWith(".ts"))) {
      callback(fullPath);
    }
  }
}

let patched = 0;

walkDir(rootDir, (file) => {
  let c;
  try {
    c = fs.readFileSync(file, "utf8");
  } catch (e) { return; }
  
  if (!c.includes("replaceEnvVariables")) return;
  
  let changed = false;
  const before = c;

  // 1. Patch function definition - 加入 undefined 檢查
  c = c.replace(/(replaceEnvVariables\s*[=:]\s*function\s*\((\w+)[^)]*\)\s*\{)/, "$1if(typeof $2==='undefined'||$2===null)return '';");
  c = c.replace(/(function\s+replaceEnvVariables\s*\((\w+)[^)]*\)\s*\{)/, "$1if(typeof $2==='undefined'||$2===null)return '';");
  c = c.replace(/(replaceEnvVariables\s*\((\w+)[^)]*\)\s*\{)/, "$1if(typeof $2==='undefined'||$2===null)return '';");

  // 2. Patch function body - 找到函數體，把所有 xxx.replace( 改成 (xxx||'').replace(
  const funcIdx = c.indexOf("replaceEnvVariables");
  if (funcIdx >= 0) {
    const braceStart = c.indexOf("{", funcIdx);
    if (braceStart >= 0) {
      let depth = 0;
      let braceEnd = braceStart;
      for (let i = braceStart; i < c.length; i++) {
        if (c[i] === '{') depth++;
        else if (c[i] === '}') { depth--; if (depth === 0) { braceEnd = i; break; } }
      }
      const funcBody = c.substring(braceStart, braceEnd + 1);
      const patchedBody = funcBody.replace(/([a-zA-Z_$][a-zA-Z0-9_$]*)\.replace\(/g, "($1||'').replace(");
      c = c.substring(0, braceStart) + patchedBody + c.substring(braceEnd + 1);
    }
  }

  // 3. Patch call sites - xxx.replaceEnvVariables(arg) -> xxx.replaceEnvVariables(arg||'')
  c = c.replace(/(\.replaceEnvVariables)\(([^)]+)\)/g, "$1($2||'')");

  // 4. Patch setOrientation and orientation access (only in android files)
  if (file.includes("android") && c.includes("setOrientation")) {
    c = c.replace(/(setOrientation\s*\((\w+)[^)]*\)\s*\{)/, "$1$2=$2||{landscapeRight:true,landscapeLeft:true,portrait:false,upsideDown:false};");
    c = c.replace(/(\w+)\.landscapeRight/g, "($1||{}).landscapeRight");
    c = c.replace(/(\w+)\.landscapeLeft/g, "($1||{}).landscapeLeft");
    c = c.replace(/(\w+)\.portrait/g, "($1||{}).portrait");
    c = c.replace(/(\w+)\.upsideDown/g, "($1||{}).upsideDown");
  }

  if (c !== before) {
    try {
      fs.writeFileSync(file, c, "utf8");
      patched++;
      console.log("Patched: " + file);
    } catch (e) {
      console.log("Failed to write: " + file + " - " + e.message);
    }
  }
});

console.log("Total patched: " + patched);
