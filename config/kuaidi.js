const axios = require('./axios');
const md5 = require('md5');
const qs = require('querystring')

var customer = ""; //公司编号
var key = "" //快递100 key

var api = "https://poll.kuaidi100.com/poll/query.do"; //正式环境请求地址
var automaticIdentificationApi = "http://www.kuaidi100.com/autonumber/auto" //智能判断接口
var subscriptionApi = "https://poll.kuaidi100.com/poll"; //订阅请求地址


/**
 * 智能智能判断方法
 * 先调用 automaticIdentificationApi 接口根据用户发送的快递单号，
 * 判断该单号可能所属的快递公司编码，返回的数据是多个可能的快递公司列表，相似度高的快递公司排名靠前。
 * 但我们这里默认使用第一个快递公司编码去查询。后期可实现让用户回答而选择快递公司，或更换快递公司重新查询。
 * 
 * @param number 快递单号
 * @param callback 回调方法
 */
async function smartQuery(number, callback) {
    var queryData = {
        "num": number,
        "key": key
    };

    function query(comCode) {
        if (comCode.length == 0) {
            callback("这是嘛公司的快递？")
            return
        }
        //获取每一个公司作为查询条件
        getShippingContent(comCode[0].comCode, number, callback);
    }

    axios.post(automaticIdentificationApi, queryData, query);
}


/**
 * 查询快递物流轨迹信息
 * 用户主动发快递单号信息给机器人，然后根据智能判断的方法获得快递公司编码和快递单号进行实时请求快递公司单号查询接口，并将获取到的物流轨迹信息。
 * 
 * @param com 快递公司
 * @param number 快递单号
 * @param callback 回调方法
 */
async function getShippingContent(com, number, callbackBot) {
    var queryData = [];
    var param = {
        "com": com,
        "num": number
    };
    // 按param + key + customer 的顺序进行MD5加密
    var paramString = JSON.stringify(param);
    var md5String = paramString + key + customer;
    // 拼接请求参
    queryData["customer"] = customer;
    queryData["param"] = JSON.stringify(param);
    queryData["sign"] = md5(md5String).toUpperCase();
    //发起请求并回调
    axios.post(api, queryData, callbackBot);
}

/**
 * 格式化物流返回信息
 * @param response 格式化的JSON
 */
function formatOut(response) {
    //判断快递单是否存在
    if (JSON.stringify(response).search("查询无结果") != -1) {
        callback("没有这个快递单，哈哈哈...");
        return;
    }
    var array = response.data.reverse();
    //0在途，1揽收，2疑难，3签收，4退签，5派件，6退回，7转投
    var status;
    switch (response.state) {
        case "0":
            status = "【在途】货物正在运输中";
            break;
        case "1":
            status = "【揽收】已由快递公司揽收";
            break;
        case "2":
            status = "【疑难】请联系快递公司";
            break;
        case "3":
            status = "【签收】收件人已签收";
            break;
        case "4":
            status = "【退签】即货物由于用户拒签、超区等原因退回，而且发件人已经签收";
            break;
        case "5":
            status = "【派件】快递正在派件中";
            break;
        case "6":
            status = "【退回】正在退回发件人";
            break;
        case "7":
            status = "【转投】正在转投发件人";
            break;
        default:
            status = "识别物流状态失败，请查询物流详情";
            break;
    }
    let formatString = "";
    for (let key in array) {
        formatString = formatString.concat(array[key].time + "\n");
        formatString = formatString.concat(array[key].context + "\n\n");
    }
    formatString = formatString.concat("最新状态：" + status);
    return formatString;
}

/**
 * 订阅快递
 * @param response 快递查询返回的信息需要传入做订阅基础数据
 */
async function subscription(response) {
    var subscriptionParam = {
        "schema": "json",
        "param": {
            "company": response.com,
            "number": response.nu,
            "key": key,
            "parameters": {
                "callbackurl": "https://esimple.cc/callback",
                "resultv2": "1"
            }
        }
    };
    async function callbackSubscription(response) {
        //订阅成功后的事情
        console.log("订阅请求返回结果", response.result);
    };
    axios.post(subscriptionApi, subscriptionParam, callbackSubscription);
}


module.exports = {
    smartQuery,
    formatOut,
    subscription
}