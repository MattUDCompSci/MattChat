import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.4/firebase-app.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/9.9.4/firebase-database.js";
import * as fbauth from "https://www.gstatic.com/firebasejs/9.9.4/firebase-auth.js";
import * as fbstorage from "https://www.gstatic.com/firebasejs/9.9.4/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBgf2z0Wcfe8oo2dPdupJPTOQ4Lzl9Psfc",
  authDomain: "mattchat-d73aa.firebaseapp.com",
  databaseURL: "https://mattchat-d73aa-default-rtdb.firebaseio.com",
  projectId: "mattchat-d73aa",
  storageBucket: "mattchat-d73aa.appspot.com",
  messagingSenderId: "40152126996",
  appId: "1:40152126996:web:1a12426f226688b750f901",
  measurementId: "G-0LQJCTGNMD"
};

const app = initializeApp(firebaseConfig);
const auth = fbauth.getAuth(app);
let db = rtdb.getDatabase(app);
let storage = fbstorage.getStorage(app);
var uid;

let chatModal = document.getElementById("ChatModal");
let chatModalContent = document.getElementById("ChatModalContent");

let tweetRef = rtdb.ref(db, "/Tweets");
let tweetJSON = {
  "content": "",
  "likes": 0,
  "liked-by": "",
  "retweets": 0,
  "reply_count": 0,
  "replies": "",
  "author": {
    "name": "",
    "handle": "",
    "pic": "",
    "uid": "",
  },
  "date": ""
};

let userRef = rtdb.ref(db, "/users");
let userJSON = {
  "name": "",
  "handle": "",
  "pic": "",
  "roles": {
    "user": true,
    "admin": false,
  },
  "retweets": "",
  "friends": "",
}

let viewedUserJSON = JSON.parse(JSON.stringify(userJSON));

function buildTweetHTML(ss, locationNum){
  return `
      <div class="tweet-wrap" uuid="${ss.val().author.uid}">
        <div class="tweet-header">
          <img src="${ss.val().author.pic}" alt="" class="avatar" data-image="${ss.val().author.uid}">
          <div class="tweet-header-info" content_area=${ss.key}>
            <div class="mainTweetContent" data-tweetid="${ss.key}">
              ${ss.val().author.name}<br>
              <span>${ss.val().author.handle}</span>
              <p>${ss.val().content}</p>
              ${ss.val().date}<br><br>
            </div>
            <i class="material-icons" data-likeid-${locationNum}="${ss.key}" style="font-size:14px">favorite</i>
            <span data-likecount-${locationNum}="${ss.key}">${ss.val().likes}</span>
            <i class="material-icons" data-retweetid-${locationNum}="${ss.key}" style="font-size:14px">autorenew</i>
            <span data-retweetcount-${locationNum}="${ss.key}">${ss.val().retweets}</span>
            <i class="material-icons" data-replyid-${locationNum}="${ss.key}" style="font-size:14px">reply</i>
            <span data-replycount-${locationNum}="${ss.key}">${ss.val().reply_count}</span>
            <i class="material-icons" data-deleteid-${locationNum}="${ss.key}" style="font-size:14px">delete</i>
          </div>
        </div>
      </div>`;
}

function addTweetIconListeners(ss, locationNum){
  let likeElement = document.querySelector(`[data-likeid-${locationNum}=${ss.key}]`);
  let userLikedRef = rtdb.ref(db, `/Tweets/${ss.key}/liked-by/${uid}`);
  let likeCountRef = rtdb.ref(db, `/Tweets/${ss.key}/likes/`);

  rtdb.onValue(userLikedRef, dd=>{
    likeElement.style.color = dd.val() == 1 ? "red" : "gray";
  });

  likeElement.addEventListener("click", function(){
    if(likeElement.style.color == "gray"){
      likeElement.style.color = "red";
      rtdb.push(userLikedRef);
      rtdb.set(userLikedRef, 1);
      rtdb.get(likeCountRef).then(dd=>{
        rtdb.set(likeCountRef, dd.val()+1);
        $(`[data-likecount-${locationNum}="${ss.key}"]`).html(dd.val() + 1);
      });

    }
    else{
      likeElement.style.color = "gray";
      rtdb.remove(userLikedRef);
      rtdb.get(likeCountRef).then(dd=>{
        rtdb.set(likeCountRef, dd.val()-1);
        $(`[data-likecount-${locationNum}="${ss.key}"]`).html(dd.val()-1);
      });

    }
  });

  let retweetElement = document.querySelector(`[data-retweetid-${locationNum}=${ss.key}]`);
  let retweetCount = document.querySelector(`[data-retweetcount-${locationNum}=${ss.key}]`);

  let userRetweetRef = rtdb.ref(db, `/users/${uid}/retweeted-tweets/${ss.key}`);
  let retweetRef = rtdb.ref(db, `/Tweets/${ss.key}/retweets`);

  rtdb.onValue(userRetweetRef, dd=>{
    retweetElement.style.color = dd.val() == 1 ? "#97D9E1" : "gray";
  });

  retweetElement.addEventListener("click", function(){
    if(retweetElement.style.color == "gray"){
      retweetElement.style.color = "#97D9E1";
      rtdb.push(userRetweetRef);
      rtdb.set(userRetweetRef, 1);
      rtdb.push(retweetRef);
      rtdb.get(retweetRef).then(dd=>{
        rtdb.set(retweetRef, dd.val()+1)
        $(`[data-retweetcount-${locationNum}="${ss.key}"]`).html(dd.val() + 1);
      });
    }
    else{
      retweetElement.style.color = "gray";
      rtdb.remove(userRetweetRef);
      rtdb.get(retweetRef).then(dd=>{
        rtdb.set(retweetRef, dd.val()-1)
        $(`[data-retweetcount-${locationNum}="${ss.key}"]`).html(dd.val() - 1);
      });
    }
  });
  
  let replyElement = document.querySelector(`[data-replyid-${locationNum}=${ss.key}]`);
  let replyCount = document.querySelector(`[data-replycount-${locationNum}=${ss.key}]`);
  
  let replyCountRef = rtdb.ref(db, `/Tweets/${ss.key}/reply_count`)
  
  replyElement.addEventListener("click", function(){
    openTweetWindow();
    document.getElementById("SendTweet").addEventListener("click", function(){
      let newReplyRef = rtdb.push(rtdb.ref(db, `/Tweets/${ss.key}/replies/`));
      let newUserReplyRef = rtdb.push(rtdb.ref(db, `/users/${uid}/replies/`));
      setTweetJSON();
      rtdb.set(newReplyRef, tweetJSON);
      rtdb.set(newUserReplyRef, tweetJSON);
      rtdb.get(replyCountRef).then(dd=>{
        rtdb.set(replyCountRef, dd.val()+1);
        $(`[data-replycount-${locationNum}=${ss.key}]`).html(dd.val() + 1);
      });
    });
  });
  
  let deleteElement = document.querySelector(`[data-deleteid-${locationNum}=${ss.key}]`);
  if(uid == ss.val().author.uid){
    deleteElement.addEventListener("click", function(){
      rtdb.remove(rtdb.ref(db, `/Tweets/${ss.key}`));
    });
  }
  else{
    deleteElement.remove();
  }
}

function buildProfileModal(uidProfile){
  rtdb.onValue(rtdb.ref(db, `/users/${uidProfile}/name/`), ss=>{ viewedUserJSON.name = ss.val(); });
  rtdb.onValue(rtdb.ref(db, `/users/${uidProfile}/pic/`), ss=>{ viewedUserJSON.pic = ss.val(); });
  rtdb.onValue(rtdb.ref(db, `/users/${uidProfile}/handle/`), ss=>{ viewedUserJSON.handle = ss.val(); });
  
  let usersFriends = rtdb.ref(db, `/users/${uid}/friends/${uidProfile}`);
  let friendsOfUser = rtdb.ref(db, `/users/${uidProfile}/friends/${uid}`);
  let buttonMessage = "";
  
  rtdb.push(usersFriends);
  rtdb.push(friendsOfUser);
  
  chatModalContent.innerHTML = 
    `<div id="ProfilePicModal">
       <img src="${viewedUserJSON.pic}" alt="" class="avatar" id="ViewedUserPic"><br>
       <div id="ViewedUserInfo">
         ${viewedUserJSON.handle}<br>
         <h1>${viewedUserJSON.name}</h1>
         <button id="FriendButton"></button>
       </div>
     </div>
     <div class="profileColumns" style="display:flex; justify-content:center;">
       <div>
         <h1 class="HeaderTitle">Tweets</h1>
         <div id="ViewedUsersTweets"></div>
       </div>  
       <div>
         <h1 class="HeaderTitle">Retweets</h1>
         <div id="ViewedUserRetweets"></div>
       </div>
       <div>
         <h1 class="HeaderTitle">Friends</h1>
         <div id="ViewedUserFriends"></div>
       </div>
     </div>`;
  chatModal.style.display = "block";
  rtdb.onChildAdded(tweetRef, ss=>{
    if(ss.val().author.uid == uidProfile){
      let viewedUserTweetsHTML = buildTweetHTML(ss, 2);
      $("#ViewedUsersTweets").prepend(viewedUserTweetsHTML);
      addTweetIconListeners(ss, 2);
    }
    rtdb.get(rtdb.ref(db, `/users/${uidProfile}/retweeted-tweets/${ss.key}`)).then(dd=>{
      if(dd.val() == 1){
        let viewedUserRetweetsHTML = buildTweetHTML(ss, 3);
        $("#ViewedUserRetweets").prepend(viewedUserRetweetsHTML);
        addTweetIconListeners(ss, 3);
      }
    });
  });
  
  rtdb.onChildAdded(userRef, ss=>{
    rtdb.get(rtdb.ref(db, `/users/${uidProfile}/friends/${ss.key}`)).then(dd=>{
      if(dd.val() == 3){
        $("#ViewedUserFriends").append(`<div class="tweet-wrap" friend_id="${ss.key}"style="animation-delay: s">
        <div class="tweet-header" uuid="${ss.key}" id="tweet_uuid_${ss.key}">
          <img src="${ss.val().pic}" alt="" class="avatar">
          <div class="tweet-header-info">
            ${ss.val().name}<br>
            <span>${ss.val().handle}</span>
          </div>
        </div>
      </div>`);
      }
    });
  });
  
  rtdb.get(usersFriends).then(dd=>{
    switch(dd.val()){
      case 1:
        buttonMessage = "Pending...";
        break;
      case 2:
        buttonMessage = "Accept Friend?";
        break;
      case 3:
        buttonMessage = "- Remove Friend";
        break;
      default:
        buttonMessage = "+ Add Friend";
        break;
    }
    document.getElementById("FriendButton").innerText = buttonMessage;
  });
  
  document.getElementById("FriendButton").addEventListener("click", function(){
    rtdb.get(usersFriends).then(dd=>{
      switch(dd.val()){
        case 1:
          break;
        case 2:
          rtdb.set(usersFriends, 3);
          rtdb.set(friendsOfUser, 3);
          document.getElementById("FriendButton").innerText = "- Remove Friend";
          $("#ViewedUserFriends").append(`<div class="tweet-wrap" friend_id="${uid}"style="animation-delay: s">
            <div class="tweet-header" uuid="${uid}" id="tweet_uuid_${uid}">
              <img src="${userJSON.pic}" alt="" class="avatar">
              <div class="tweet-header-info">
                ${userJSON.name}<br>
                <span>${userJSON.handle}</span>
              </div>
            </div>
          </div>`);
          break;
        case 3:
          rtdb.set(usersFriends, 0);
          rtdb.set(friendsOfUser, 0);
          document.getElementById("FriendButton").innerText = "+ Add Friend";
          document.querySelector(`[friend_id="${uid}"]`).remove();
          break;
        case 0:
        default:
          rtdb.set(usersFriends, 1);
          rtdb.set(friendsOfUser, 2);
          document.getElementById("FriendButton").innerText = "Pending...";
          break;
      }
    });
  });
}

function openTweetWindow(){
  let currDate = (new Date()).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  chatModalContent.innerHTML = 
  `<div class="tweet-wrap">
      <div class="tweet-write-header">
        <img src="${userJSON.pic}" alt="" class="avatar">
        <div class="tweet-header-info">
          ${userJSON.name} &emsp;
          <span>${userJSON.handle}</span><br>
          <textarea id="TweetTextField" style="width:50%;height:30%;"></textarea><br>
          <span id="NewTweetTime">${currDate}</span><br>
          <button style="height:10%;width:20%" id="SendTweet">Submit</button>
          <button style="height:10%;width:20%" id="CancelTweet">Cancel</button>
        </div>
      </div>
    </div>`;
  
  chatModal.style.display = "block";
  
  document.getElementById("CancelTweet").addEventListener("click", function(){
    chatModalContent.innerHTML = "";
    chatModal.style.display = "none";
  });
}

function setTweetJSON(){
  tweetJSON.content = document.getElementById("TweetTextField").value;
  tweetJSON.date = (new Date()).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
  tweetJSON.author.name = userJSON.name;
  tweetJSON.author.handle = userJSON.handle;
  tweetJSON.author.pic = userJSON.pic;
  tweetJSON.author.uid = uid;
  chatModalContent.innerHTML = "";
  chatModal.style.display = "none";
}

function buildUsersList(ss){
  $("#UsersList").append(`<div class="tweet-wrap" style="animation-delay: s">
    <div class="tweet-header" uuid="${ss.key}" id="tweet_uuid_${ss.key}">
      <img src="${ss.val().pic}" alt="" class="avatar">
      <div class="tweet-header-info">
        ${ss.val().name}<br>
        <span>${ss.val().handle}</span>
      </div>
    </div>
  </div>`);
  
  let userSelector = document.getElementById(`tweet_uuid_${ss.key}`);
  userSelector.addEventListener("click", function(){
    buildProfileModal(ss.key);
  });
}

fbauth.onAuthStateChanged(auth, user => {
  $("#PostArea").empty();
  if (user) {
    uid = user.uid;

    document.getElementById("ChatButton").style.display = "inline-block";
    document.getElementById("LogoutButton").style.display = "inline-block";
    document.getElementById("SignUpButton").style.display = "none";
    document.getElementById("LoginButton").style.display = "none";

    rtdb.onValue(rtdb.ref(db, `/users/${uid}/name/`), ss=>{ userJSON.name = ss.val(); });
    rtdb.onValue(rtdb.ref(db, `/users/${uid}/handle/`), ss=>{ userJSON.handle = ss.val(); });
    rtdb.onValue(rtdb.ref(db, `/users/${uid}/pic/`), ss=>{
      userJSON.pic = ss.val();
      document.getElementById("ProfilePic").setAttribute("src", ss.val());
    });
    
    document.getElementById("ProfilePic").addEventListener("click", function(){
      buildProfileModal(uid);
    });
    
    rtdb.onChildAdded(tweetRef, ss=>{
      let postAreaHTML = buildTweetHTML(ss, 1);
      $("#PostArea").prepend(postAreaHTML);
      
      document.querySelector(`[data-image="${ss.val().author.uid}"]`).addEventListener("click", function(){
        buildProfileModal(ss.val().author.uid);
      });
      
      addTweetIconListeners(ss, 1);

      document.querySelector(`[data-tweetid=${ss.key}]`).addEventListener("click", function() {
        let selectedTweetRef = rtdb.ref(db, `/Tweets/${ss.key}/replies/`);

        chatModalContent.innerHTML = buildTweetHTML(ss, 4);
        addTweetIconListeners(ss, 4);
        chatModal.style.display = "block";

        rtdb.onChildAdded(selectedTweetRef, ss=>{
          chatModalContent.innerHTML = chatModalContent.innerHTML + 
         `<div class="tweet-wrap reply-wrap" data-tweetid="${ss.key}">
            <div class="tweet-header">
              <img src="${ss.val().author.pic}" alt="" class="avatar">
              <div class="tweet-header-info">
                ${ss.val().author.name}<br>
                <span>${ss.val().author.handle}</span>
                <p>${ss.val().content}</p>
                <span>${ss.val().date}</span><br><br>
              </div>
            </div>
          </div>`;
        });
      });
    });
    
    rtdb.onChildAdded(userRef, ss=>{
      buildUsersList(ss);
    });
    
    document.getElementById("FindUsers").addEventListener("click", function(){
      let searchTerm = $("#SearchUsers").val();
      $("#UsersList").empty();
      rtdb.onChildAdded(userRef, ss=>{
        if(ss.val().handle.includes(searchTerm) || ss.val().name.includes(searchTerm)){
          buildUsersList(ss);
        }
      });
    });
  } 
  else {
    document.getElementById("ChatButton").style.display = "none";
    document.getElementById("LoginButton").style.display = "inline-block";
    document.getElementById("SignUpButton").style.display = "inline-block";
    document.getElementById("LogoutButton").style.display = "none";
    document.getElementById("ProfilePic").setAttribute("src", "https://cdn.glitch.global/9eae5660-40bf-49c5-9d1a-ba9b95b0e97c/NoUser.png?v=1664684381473");
    
    $("#PostArea").prepend(`
      <div class="tweet-wrap" id="BasicTweet">
        <div class="tweet-header">
          <img src="https://cdn.glitch.global/9eae5660-40bf-49c5-9d1a-ba9b95b0e97c/NoUser.png?v=1664684381473" alt="" class="avatar">
          <div class="tweet-header-info">
            <div class="mainTweetContent" >
              Welcome to Mattchat<br>
              <span>@welcome</span>
              <p>Welcome to MattChat! Please Login or Sign up to view tweets and have the whole Mattchat experience!</p>
              10/08/2022, 07:13:58 PM EDT<br><br>
            </div>
          </div>
        </div>
      </div>`);
  }
});

document.getElementById("ChatButton").addEventListener("click", function() {
  openTweetWindow();
  document.getElementById("SendTweet").addEventListener("click", function(){
    let newTweetRef = rtdb.push(tweetRef);
    let newUserTweetRef = rtdb.push(rtdb.ref(db, `/users/${uid}/tweets/`));
    setTweetJSON();
    rtdb.set(newTweetRef, tweetJSON);
    rtdb.set(newUserTweetRef, tweetJSON);
  });
});
document.getElementById("LoginButton").addEventListener("click", function() {

  chatModalContent.innerHTML = 
    `<div style="display:flex">
      <div style="flex:1;text-align:center">
        <h1 class="HeaderTitle">MattChat</h1>
        <button id="LoginUser">Login</button><br>
        <button id="ForgotPassword">Reset Password</button>
      </div>
      <div class="LoginPanel">
        <h1 class="HeaderTitle" style="color:black">Email:</h1>
        <input type="text" id="UserEmail">
        <h1 class="HeaderTitle" style="color:black">Password:</h1>
        <input type="password" id="UserPassword"><br>
      </div>
    </div>`;

  chatModal.style.display = "block";
  document.getElementById("LoginUser").addEventListener("click", function(){
    let email = document.getElementById("UserEmail").value;
    let password = document.getElementById("UserPassword").value;
    fbauth.signInWithEmailAndPassword(auth, email, password).then((userCredential) => {
      chatModal.style.display = "none";
    }).catch((error) => {
      console.log(error.code);
      console.log(error.message);
    });
  });
  document.getElementById("ForgotPassword").addEventListener("click", function(){
    chatModalContent.innerHTML = 
    `<div style="display:flex">
      <div style="flex:1;text-align:center">
        <h1 class="HeaderTitle">MattChat</h1>
        <button id="ResetPassword">Reset</button>
      </div>
      <div class="LoginPanel">
        <h1 class="HeaderTitle" style="color:black">Email:</h1>
        <input type="text" id="ResetEmail">
      </div>
    </div>`;
    document.getElementById("ResetPassword").addEventListener("click", function(){
      let email = document.getElementById("ResetEmail").value;
      fbauth.sendPasswordResetEmail(auth, email).then((userCredential) => {
        chatModal.style.display = "none";
      }).catch((error) => {
        console.log(error.code);
        console.log(error.message);
      });
    });
  });
});

document.getElementById("SignUpButton").addEventListener("click", function() {

  chatModalContent.innerHTML = 
  `<div style="display:flex; vertical-align:center">
     <div style="flex:1;text-align:center">
       <h1 class="HeaderTitle">MattChat</h1>
       <p class="HeaderTitle">Welcome to MattChat! A place for people to chat about anything.</p>
       <p class="HeaderTitle">When using this site, please remember to be respectful of other members.
       No comments that may be discriminatory, inappropriate, or offensive in any way. This website
       is for educational purposes only and is susceptible to many security attacks. Please
       do not use any important passwords or post any important information on this site. And as always, enjoy
       the Mattchataverse!</p>
       <button id="RegisterUser">Join</button>
     </div>
     <div class="LoginPanel">
       <h1 class="HeaderTitle" style="color:black">Name:</h1>
       <input type="text" id="NewName">
       <h1 class="HeaderTitle" style="color:black" >Email:</h1>
       <input type="text" id="NewEmail">
       <h1 class="HeaderTitle" style="color:black" >Username:</h1>
       <input type="text" id="NewUsername">
       <h1 class="HeaderTitle" style="color:black" >Profile Picture URL:</h1>
       <input type="file" accept="image/png, image/jpeg" id="NewProfilePic">
       <h1 class="HeaderTitle" style="color:black" >Password:</h1>
       <input type="password" id="NewPassword">
       <h1 class="HeaderTitle" style="color:black" >Confirm Password:</h1>
       <input type="password" id="ConfirmNewPassword"><br>
      </div>
   </div>`;

  chatModal.style.display = "block";
  document.getElementById("RegisterUser").addEventListener("click", function() {
    let email = document.getElementById("NewEmail").value;
    let p1 = document.getElementById("NewPassword").value;
    let p2 = document.getElementById("ConfirmNewPassword").value;

    if (p1 != p2){
      alert("Passwords don't match");
      return;
    }

    fbauth.createUserWithEmailAndPassword(fbauth.getAuth(app), email, p1).then(somedata=>{
      let newUid = somedata.user.uid;
      let userRef = rtdb.ref(db, `/users/${newUid}`);
      
      var profilePicFile = document.getElementById('NewProfilePic').files[0];
      let storageDest = fbstorage.ref(storage, `profilePics/${profilePicFile.name}`);

      fbstorage.uploadBytes(storageDest, profilePicFile).then(ss=>{
        fbstorage.getDownloadURL(storageDest).then((url)=>{
          userJSON.name = document.getElementById("NewName").value;
          userJSON.handle = "@" + document.getElementById("NewUsername").value;
          userJSON.pic = url;
          rtdb.set(userRef, userJSON);
          document.getElementById("ProfilePic").setAttribute("src", userJSON.pic);
        });
      });

    }).catch(function(error) {
      console.log(error.code);
      console.log(error.message);
    });
    chatModal.style.display = "none";
  });
});

document.getElementById("LogoutButton").addEventListener("click", function() {
  fbauth.signOut(auth);
});

window.onclick = function(event) {
  if (event.target == document.getElementById("ChatModal")) {
    document.getElementById("ChatModal").style.display = "none";
  }
};