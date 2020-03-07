const { Wechaty } = require('wechaty')
const axios = require('./config/axios');
const mongodb = require('./config/mongodb');
const kuaidi = require('./config/kuaidi');
const express = require('express')

//监听3000端口
const app = express();
const port = 3000;
// 延时函数，防止检测出类似机器人行为操作
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

//  二维码生成
function onScan(qrcode, status) {
    // // 在console端显示二维码
    // require('qrcode-terminal').generate(qrcode);
    // const qrcodeImageUrl = [
    //     'https://api.qrserver.com/v1/create-qr-code/?data=',
    //     encodeURIComponent(qrcode)
    // ].join('');
    // console.log(qrcodeImageUrl);
    console.log(`Scan QrCode to login: ${status}\n${qrcode}`);
}


// 登录
async function onLogin(user) {
    console.log(`Wechaty ${user} 登录了`);
    // 登陆后动作，这里可以写你要实现的登陆后东西
    // 用于解析 application/x-www-form-urlencoded
    app.use(express.urlencoded({ extended: true }));

    /**
     * 当用户查询快递物流信息时，系统自动订阅该快递单到快递100平台进行监控，
     * 如果监控到有更新，就主动将物流跟踪信息推送到这里。然后通过WeChaty推送给用户。
     */
    app.post('/callback', async function(req, res) {
        // 接收订阅的物流轨迹信息数据
        var callbackData = JSON.parse(req.body.param);
        var lastResult = callbackData.lastResult;
        mongodb.find(lastResult.nu, lastResult.com, pushToWeChatUser);
        // 推送给微信用户
        async function pushToWeChatUser(user) {
            let returnString = "";
            returnString = returnString.concat(`你订阅的快递有更新啦~~~\n\n`);
            returnString = returnString.concat(`快递单号：${lastResult.nu} \n\n`);
            returnString = returnString.concat(lastResult.data[0].ftime + "\n");
            returnString = returnString.concat(lastResult.data[0].context);
            // 向订阅该快递单的用户推送更新信息
            for (let key in user) {
                console.log("wechatId", user[key].wechatId)
                const pushToContact = await this_bot.Contact.find({ id: user[key].wechatId });
                console.log("向用户推送更新信息", pushToContact.payload.name);
                await pushToContact.say(returnString);
                await delay(2000);
            }
        }
        //回应接收返回结果
        res.send("{\"result\":true,\"returnCode\":\"200\",\"message\":\"接收成功\"}");
    });
    //监听3000端口
    app.listen(port, () => console.log(`在WeChaty服务上监听 ${port} 端口...`));

}


//登出
function onLogout(user) {
    console.log(`Wechaty ${user} 已经登出`);
}


// 监听对话
async function onMessage(msg) {
    const contact = msg.from(); // 发消息人
    const content = msg.text().trim(); // 消息内容
    const room = msg.room(); // 是否是群消息
    const alias = await contact.alias(); // 发消息人备注
    const isText = msg.type() === bot.Message.Type.Text;

    if (msg.self()) {
        return;
    }

    if (room && isText) {
        // 如果是群消息 目前只处理文字消息
        const topic = await room.topic();
        console.log(`群名: ${topic} 发消息人: ${contact.name()} 内容: ${content}`);
    } else if (isText) {
        // 如果非群消息 目前只处理文字消息
        console.log(`发消息人: ${alias} 消息内容: ${content}`);

        // 回调返回实时物流信息给微信用户并订阅
        async function callback(response) {
            // 订阅回调
            async function subscription(data) {
                await delay(2000);
                if (data.length === 0) {
                    //插入订阅记录
                    mongodb.insertSubscription(contact.payload.id, response.nu)
                    kuaidi.subscription(response)
                    await contact.say("OK，这个快递有动态我会通知你~");
                } else {
                    await contact.say("已经有人同时关注着这个快递");
                }
            }
            //发送快递物流信息
            await delay(2000);
            await contact.say(kuaidi.formatOut(response));
            // 查找订阅记录，如果没有被订阅过就订阅
            mongodb.findSubscription(response.nu, subscription);
            // 增加查询记录
            mongodb.insert(contact.payload.id, response);
        }
        // 查询用户发过来的快递单号实时物流信息
        kuaidi.smartQuery(content, callback)
    }
}


const bot = new Wechaty({ name: 'WechatyBotName' });
global.this_bot = bot;

bot.on('scan', onScan);
bot.on('login', onLogin);
bot.on('logout', onLogout);
bot.on('message', onMessage);
bot
    .start()
    .then(() => console.log('开始登陆Wechaty'))
    .catch(e => console.error(e));