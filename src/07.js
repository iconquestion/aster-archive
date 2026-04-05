const express = require("express");

const router = express.Router();

// 07关：根据 location 返回对应场景文案。
router.get("/", (req, res) => {
    const { location } = req.query;
    let responseMsg;
    switch (location) {
        case "visit_grand_reading_hall": {
            responseMsg = "这里曾是档案馆最庄严的空间，高耸的穹顶下陈列着无数记录历史的长桌与卷宗。如今尘埃覆盖，一些书页却似乎仍在无风中轻轻翻动。";
            break;
        }
        case "visit_archive_room": {
            responseMsg = "这里存放着按分类整理的各类历史与地理档案，曾向公众开放查阅。部分档案出现缺页或错位，似乎隐藏着被刻意遗漏的内容。";
            break;
        }
        case "visit_exhibit_corridor": {
            responseMsg = "长廊中展示着精选的档案复制品与重要记录的摘要，是了解档案馆历史的最佳起点。细心观察的话，你或许会发现展品内容并不总是如记忆中那样固定。";
            break;
        }
        case "visit_admin_office": {
            responseMsg = "这里曾经是档案的管理办公室，陈列着早已泛黄的旧文件和木制桌椅。最上面的文件是有关08房间c2x8m5q9nv档案的展出规划资料。";
            break;
        }
        case null:
        case undefined: {
            responseMsg = "请指定一个具体的参观位置。";
            break;
        }
        default: {
            responseMsg = "很抱歉，该区域当前不对外开放。建议您前往其他区域参观，以获取更多关于档案馆的公开信息。\n以下是推荐的区域：主览大厅, 公共档案区, 展示长廊，管理办公室";
            break;
        }
    }
    res.json({ message: responseMsg });
});

module.exports = router;
