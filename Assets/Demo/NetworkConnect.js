#pragma strict

//networking
var IP = "127.0.0.1";
var Port = 25001;
	
var username = "";
var RegisterUI = false;
var LoginUI = false;

var useNAT = true;

var Caster : GameObject;
var Pollux : GameObject;

function Start () {
	
}

function LaunchServer () {
	Network.incomingPassword = "HolyMoly";
    var useNat = !Network.HavePublicAddress();
    Network.InitializeServer(32, 25000, useNat);
}

function CloseServer() {
	Network.Disconnect(200);
}

function DisconnectFromServer () {
    if (Network.connections.Length == 1) 
    {
    	Debug.Log("Disconnecting: " + Network.connections[0].ipAddress + ":" + Network.connections[0].port);
        		
        Network.CloseConnection(Network.connections[0], true);
   	} 
   	else if (Network.connections.Length == 0)
    	Debug.Log("No one is connected");
    else if (Network.connections.Length > 1)
    	Debug.Log("Too many connections. Are we running a server?");
}

function Update () {
}

function Login(Username : String)
{
	if(Network.isServer)
	{
		var checkUsername = PlayerPrefs.HasKey(Username);
		
		if(checkUsername == true)
		{
			networkView.RPC("LoadLevel",RPCMode.Others);
		}	
	}
}

function LoadLevel()
{
	if(Network.isClient)
	{
		if(Application.loadedLevel == 0)
		{
			Application.LoadLevel(1);
		}
	}
}

function Register(Username : String)
{
	if(Network.isServer)
	{
		PlayerPrefs.SetString(Username,Username);
	}
}//end Register method



function OnGUI() {
	if(Network.peerType == NetworkPeerType.Disconnected)
	{
		if(GUI.Button(new Rect(100,100,100,25),"Start Client"))
		{
			Network.Connect(IP,Port);
			this.GetComponent(Follow).target = Pollux;
		}
		if(GUI.Button(new Rect(100,125,100,25),"Start Server"))
		{
			Network.InitializeServer(10,Port, useNAT);
			this.GetComponent(Follow).target = Caster;
		}
	}
	else {
		if(Network.peerType == NetworkPeerType.Client)
		{
			if(RegisterUI == true && LoginUI == false)
			{
				username = GUI.TextArea(new Rect(100,125,110,25),username);
				
				if(GUI.Button(new Rect(100,150,110,25),"Register"))
				{
					networkView.RPC("Register",RPCMode.Server,username);
					RegisterUI = false;
				}
			}
			else if(LoginUI == true && RegisterUI == false)
			{
				username = GUI.TextArea(new Rect(100,125,110,25),username);
				
				if(GUI.Button(new Rect(100,150,110,25),"Login"))
				{
					networkView.RPC("Login",RPCMode.Server,username);
				}
			}
			else {
			
				GUI.Label(new Rect(100,100,100,25),"Client");
				
				if(GUI.Button(new Rect(100,125,110,25),"Login"))
				{
					LoginUI = true;
				}
				
				if(GUI.Button(new Rect(100,150,110,25),"Register"))
				{
					RegisterUI = true;
				}
				
				
				if(GUI.Button(new Rect(100,175,110,25),"Logout"))
				{
					Network.Disconnect(250);	
				}
			}
			
		}
		if(Network.peerType == NetworkPeerType.Server)
		{
			GUI.Label(new Rect(100,100,100,25),"Server");
			GUI.Label(new Rect(100,125,100,25),"Connections: " + Network.connections.Length);
			
			if(GUI.Button(new Rect(100,150,100,25),"Logout"))
			{
				Network.Disconnect(250);	
			}
		}
	}
}//end OnGUI method