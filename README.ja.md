# 概要
このユーザースクリプトは、U-Fret（ufret.jp）のコード検索・表示機能をYouTubeに直接統合するものです。
これにより、ミュージックビデオを視聴しながら、コード情報を素早く確認することができます。
![screenshot](sample.jpg)
# 機能
1. **保存ボタン**
   - `scroll速度`、`コードキー`、`videoId`が**favoriteタブ**に保存され、動画のURLとvideoIdがマッチしたら自動的に**chordタブ**で保存した設定で表示されます。
2. **optionsタブ**
   - `常に非表示:` overlayが常に非表示になります。
   - `import/export:` 保存したコードをシェアできます。(`videoId`とマッチしてない曲を保存します。)
# インストール
1. **Tampermonkey をインストールする**  
   - Chrome : [Tampermonkey](https://chromewebstore.google.com/detail/tampermonkey-%E3%83%99%E3%83%BC%E3%82%BF%E7%89%88/gcalenpjmijncebpfijmoaglllgpjagf)
   - Firefox : [Tampermonkey](https://addons.mozilla.org/ja/firefox/addon/tampermonkey/)

2. **ユーザースクリプトを許可する**  
   拡張機能の管理で「ユーザースクリプトを許可」してください。詳しくは公式 [FAQ](https://www.tampermonkey.net/faq.php?locale=ja&q=Q209) を参照してください。  

3. **youtube-ufret-chords-usersciprt をインストール**    
   [ここ](https://github.com/grmpnk/youtube-ufret-chords-usersciprt/raw/refs/heads/main/userscript.user.js) から インストールできます。
