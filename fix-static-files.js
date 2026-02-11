const fs = require('fs');
const path = require('path');

// 修复HTML文件中的路径引用
function fixHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 将绝对路径改为相对路径
    content = content.replace(/\/_(next|static)/g, './_$1');
    content = content.replace(/\/favicon\.ico/g, './favicon.ico');
    
    fs.writeFileSync(filePath, content);
    console.log(`已修复: ${filePath}`);
}

// 修复CSS和JS文件中的路径引用
function fixAssetFiles(dirPath) {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            fixAssetFiles(fullPath);
        } else if (file.endsWith('.css') || file.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // 修复CSS中的url引用
            if (file.endsWith('.css')) {
                content = content.replace(/url\(['"]?\/(_next|static)/g, 'url("./$1');
            }
            
            fs.writeFileSync(fullPath, content);
            console.log(`已修复: ${fullPath}`);
        }
    }
}

// 主函数
function main() {
    const outDir = './out';
    
    // 修复HTML文件
    const htmlFile = path.join(outDir, 'index.html');
    if (fs.existsSync(htmlFile)) {
        fixHtmlFile(htmlFile);
    }
    
    // 修复资源文件
    const staticDir = path.join(outDir, '_next');
    if (fs.existsSync(staticDir)) {
        fixAssetFiles(staticDir);
    }
    
    console.log('路径修复完成！现在可以直接打开index.html文件了。');
}

// 执行修复
main();