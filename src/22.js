const express = require('express');
const router = express.Router();

function extractPreferredLang(req) {
  const acceptLanguage = req.get('accept-language');
  if (!acceptLanguage) {
    return '';
  }

  const [firstLang = ''] = acceptLanguage.split(',');
  const [langTag = ''] = firstLang.split(';');
  return langTag;
}

// 22关：根据 Accept-Language 返回不同语言内容，英文响应中包含下一关线索。
router.get('/', (req, res) => {
  const lang = extractPreferredLang(req);

  if (lang.includes('en')) {
    return res.json({
      message:
        'This international guest room is prepared for overseas visitors and distinguished delegates from afar. Beneath the brilliant chandeliers and polished marble floors, the reception desk provides multilingual service at 23-f6y5v4v0k0 hours, while the terminal in the corner presents notices in the language each guest knows best. Every arrangement here is made to ensure that those who enter are welcomed with ceremony, comfort, and the dignity befitting a grand international residence.',
    });
  }

  return res.json({
    message:
      '这间国际宾客厅专为来自海外的访客与远道而来的重要代表而设。璀璨的水晶吊灯映照着光洁的大理石地面，前台提供全天候多语言服务，角落里的终端也会以来宾最熟悉的语言呈现相应提示。这里的一切布置，都只为让每一位踏入此地的人，都能在庄重、舒适与体面的礼遇中感受到国际宾客厅应有的气派。',
  });
});

module.exports = router;
