var prop = PropertiesService.getScriptProperties().getProperties();

// Access token for LINE developers
var ACCESS_TOKEN = prop.LINE_ACCESS_TOKEN;
// API URL for replying message
var lineEndpoint = prop.LINE_ENDPOINT;

function doPost(e) {
  // Reply Token from WebHook
  var replyToken = JSON.parse(e.postData.contents).events[0].replyToken;
  // get an user message
  var userMessage = JSON.parse(e.postData.contents).events[0].message.text;
  
  // check the data format
  if (!/[a-zA-Z]/.test(userMessage)) {
    var message = `Your message, ${userMessage}, is not right message. It should be a Japanese prefecture name in English. \n ex) Tokyo`;
  } else {
    //retrieve data from git
    var prefectures = getCovid19Data();
    
    //filter data
    var filteredData = filterCovid19Data(userMessage, prefectures);
    if (filteredData) {
      var {formattedTarget, date, tested, testedPositive} = filterCovid19Data(userMessage, prefectures);
      var message = `【${formattedTarget} test results】\n [${date}] \n New Tests: ${tested} \n New Positives: ${testedPositive} `;
    } else {
      var message = `${userMessage} is not found. Please check your message if it is correct. \n ex) Tokyo`;
    }
  }
  
  UrlFetchApp.fetch(lineEndpoint, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + ACCESS_TOKEN,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'replyToken': replyToken,
      'messages': [{
        'type': 'text',
        'text': message,
      }],
    }),
  });
  return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
}

function getCovid19Data() {
  var gitUrl = prop.GIT_URL;
  var prefectureCsv = UrlFetchApp.fetch(gitUrl).getContentText('UTF-8');
  var prefectures = Utilities.parseCsv(prefectureCsv);
  return prefectures;
}

function filterCovid19Data(userMessage, prefectures) {
  var target = userMessage;
  var formattedTarget = target.charAt(0).toUpperCase() + target.slice(1);
  var targetData = prefectures.filter(i => i[4] === formattedTarget);
  
  if (targetData.length === 0) return false;
  
  var latest = targetData.pop();
  var pre = targetData.pop();
  var date = `${latest[1]}/${latest[2]}/${latest[0]}`;
  var testedPositive = latest[5] - pre[5];
  var tested = latest[6] - pre[6];
  return {formattedTarget, date, tested, testedPositive};
}