var MongoClient = require('mongodb').MongoClient;
var sd = require('silly-datetime');
var url = 'mongodb://localhost:27017/wechaty';
global.this_dbase;

MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
    if (err) throw err;
    this_dbase = db.db("wechaty");
    this_dbase.createCollection('express', function(err, res) {
        if (err) throw err;
    });
});


async function insert(wechatId, expressSlipData) {
    var whereStr = { "wechatId": wechatId, "expressSlipNumber": expressSlipData.nu, "companyCode": expressSlipData.com }; // 查询条件
    this_dbase.collection("express").find(whereStr).toArray(function(err, result) {
        if (err) throw err;
        if (result == false) {
            var time = sd.format(new Date(), 'YYYY-MM-DD HH:mm');
            var documentation = {
                "wechatId": wechatId,
                "expressSlipNumber": expressSlipData.nu, //快递单号
                "companyCode": expressSlipData.com, //快递公司编码，一律用小写字母
                "expressSlipStatus": expressSlipData.state, //快递单当前状态，包括0在途，1揽收，2疑难，3签收，4退签，5派件，6退回，7转投 等8个状态
                "signFor": expressSlipData.ischeck, //签收状态：0=未签收 / 1=已签收
                "logisticsData": expressSlipData.data, //物流轨迹内容数组
                "updateTime": time, //更新时间
                "createTime": time //创建时间
            };
            this_dbase.collection("express").insertOne(documentation, function(err, res) {
                if (err) throw err;
                console.log("文档插入成功");
            });
        } else {
            console.log("文档已经存在");
        }
    });
}

async function find(expressSlipNumber, companyCode, callback) {
    var whereStr = { "expressSlipNumber": expressSlipNumber, "companyCode": companyCode }; // 查询条件
    this_dbase.collection("express").find(whereStr).toArray(function(err, result) {
        if (err) throw err;
        callback(result)
    });
}


//插入订阅记录
async function insertSubscription(wechatId, expressSlipNumber) {
    var time = sd.format(new Date(), 'YYYY-MM-DD HH:mm');
    var documentation = {
        "wechatId": wechatId,
        "expressSlipNumber": expressSlipNumber, //快递单号
        "updateTime": time, //更新时间
        "createTime": time //创建时间
    };
    this_dbase.collection("subscription").insertOne(documentation, function(err, res) {
        if (err) throw err;
        console.log("插入订阅记录成功");
    });
}

/**
 * 查找订阅记录
 * @param expressSlipNumber 快递单号
 * @param callback 回调
 */
async function findSubscription(expressSlipNumber, callback) {
    var whereString = { "expressSlipNumber": expressSlipNumber }; // 查询条件
    this_dbase.collection("subscription").find(whereString).toArray(function(err, result) {
        if (err) throw err;
        callback(result)
    });
}

module.exports = {
    insert,
    find,
    insertSubscription,
    findSubscription
}