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

  // Patch replaceEnvVariables function body: 找到函數體，把所有 xxx.replace( 改成 (xxx||'').replace(
  if (c.includes("replaceEnvVariables")) {
    const before = c;
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
        if (c !== before) {
          changed = true;
          console.log("Aggressively patched replaceEnvVariables body in " + file);
        }
      }
    }
  }

  // Patch call sites: xxx.replaceEnvVariables(arg) -> xxx.replaceEnvVariables(arg||'')
  if (c.includes(".replaceEnvVariables(")) {
    const before = c;
    c = c.replace(/(\.replaceEnvVariables)\(([^)]+)\)/g, "$1($2||'')");
    if (c !== before) {
      changed = true;
      console.log("Patched call sites in " + file);
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
