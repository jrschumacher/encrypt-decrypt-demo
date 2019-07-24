const email = getUser();
const codeAuthElement = getById('codeauth');

let authType;

//construct a redirect url needed for the demo
const buildRedirectUrl = () => {
  type = authType || 'email';
  let redirectUrl = `${BASE_URL}dragdrop.html?userId=${email}&authType=${type}`;

  const envParam = getEnvParam();
  if(envParam){
    redirectUrl += `&env=${envParam}`;
  }
  return redirectUrl;
};

//Log in the user using Outlook OAuth
const loginUsingOutlook = async () => {
  authType='outlook';
  await skipLoginIfPossible(authType);
  await chooseAuthProviderByType({type: authType, redirectUrl: buildRedirectUrl()})._initAuthForProvider();
};

//Log in the user using Google OAuth
const loginUsingGoogle = async () => {
  authType='google';
  await skipLoginIfPossible(authType);
  await chooseAuthProviderByType({type: authType, redirectUrl: buildRedirectUrl()})._initAuthForProvider();
};

//Log in the user using Office365
const loginUsingOffice365 = async () => {
  authType='o365';
  await skipLoginIfPossible(authType);
  await chooseAuthProviderByType({type: authType, redirectUrl: buildRedirectUrl()})._initAuthForProvider();
};

//Show the loading spinner
const showLoading = () => { getById('codeauth').innerHTML = '<div class="loader"></div>'; };

//Go to the demo page once we've successfully authenticated
const goToDemo = () => { 
  window.location = buildRedirectUrl(); 
};

//Prepare a region which the user can input their activation code
const engageActivateCode = async () => {
  let code = getById('code').value;

  if(!code || !/^V-[0-9]{8}$/.test(code)){ 
    alert('Please enter a valid code in the form of V-XXXXXXXX');
    return;
  }

  code = code.replace('V-','');
  showLoading();
  await chooseAuthProviderByType({type: 'email-code', redirectUrl: buildRedirectUrl(), code})._initAuthForProvider();

  codeAuthElement.innerHTML = `
        <h2 class="login-instruction">You have been successfully authenticated!</h2>
        <input type="button" class="button" id="gotodemo" value="Go to Demo">
      `;
  getById('gotodemo').addEventListener('click', goToDemo);
};

//Process a request to send an activation code to a user's email address
const engageEmailLogin = async () => {
  showLoading();
  authType = 'email';
  await chooseAuthProviderByType({type: 'email-static', redirectUrl: buildRedirectUrl()}).sendCodeToEmail({ email });

  codeAuthElement.innerHTML = `
          <h2 class="login-instruction">Your code has been sent. Please check your email and enter it below.</h2>
          <input type="text" class="text-input" id="code" placeholder="Enter code" autofocus>          
          <input type="button" class="button" id="activatecodebutton" value="Activate Code">
      `;

  getById('activatecodebutton').addEventListener('click', engageActivateCode);
};

getById('googlebutton').addEventListener('click', () => loginUsingGoogle());
getById('outlookbutton').addEventListener('click', () => loginUsingOutlook());
getById('office365button').addEventListener('click', () => loginUsingOffice365());
getById('sendcodebutton').addEventListener('click', engageEmailLogin);
getById('sendcodebutton').value = `Send Code to ${email.substring(0, 15)}...`;
