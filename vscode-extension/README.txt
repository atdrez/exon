To install locally, copy the folder to your VS Code extensions directory:

cp -r vscode-extension ~/.vscode/extensions/exon-language
# then restart VS Code
To package as a .vsix for proper installation:

cd vscode-extension
npm install -g @vscode/vsce
vsce package
code --install-extension exon-language-0.1.0.vsix

