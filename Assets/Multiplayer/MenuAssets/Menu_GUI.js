/* 
*  This file is part of the Unity networking tutorial by M2H (http://www.M2H.nl)
*  The original author of this code is Mike Hergaarden, even though some small parts 
*  are copied from the Unity tutorials/manuals.
*  Feel free to use this code for your own projects, drop us a line if you made something exciting! 
*/
#pragma strict
#pragma implicit
#pragma downcast

private var windowRect1;
private var windowRect2;
private var windowRect3;

static var playNowMode : boolean = false;
static var advancedMode : boolean = false;
static var playNowModeStarted  : float = 0.0;

static var myPlayerName : String = "MyPlayerName";

//GUI vars
private var hostPlayers : int = 8;
private var hostPort : int;
private var connectPort : int;
private var connectIP : String = "";

private var multiplayerScript : Menu_multiplayerCode;
private var currentMenu : String = "";


function Awake ()
{	
	Screen.lockCursor=false;	
	
	myPlayerName = PlayerPrefs.GetString("playerName");
	
	multiplayerScript = GetComponent(Menu_multiplayerCode);

	connectPort = hostPort = multiplayerScript.serverPort;
	connectIP = "127.0.0.1";
	
	windowRect1 = Rect (Screen.width/2-310,Screen.height/2-90,380,280);
	windowRect2 = Rect (Screen.width/2+85,Screen.height/2-90,220,100);
	windowRect3 = Rect (Screen.width/2+85,Screen.height/2+55,220,100);
	
	playNowMode=false;
	advancedMode=false;
}




function OnGUI ()
{		
	//If we've connected;  load the game when it's ready to load
	if(Network.isClient || Network.isServer){
		//Since we're connected, load the game
		GUI.Box(Rect(Screen.width/4+0,Screen.height/2-30,450,50), "");
		if(Application.CanStreamedLevelBeLoaded ((Application.loadedLevel+1))){
			GUI.Label(Rect(Screen.width/4+10,Screen.height/2-25,285,150), "Starting the game!");
			Application.LoadLevel((Application.loadedLevel+1));
		}else{
			GUI.Label(Rect(Screen.width/4+10,Screen.height/2-25,285,150), "Loading the game: "+Mathf.Floor(Application.GetStreamProgressForLevel((Application.loadedLevel+1))*100)+" %");
		}	
		return;
	}
	
	
	//Dirty error message popup
		if(multiplayerScript.errorMessage && multiplayerScript.errorMessage!=""){	
		GUI.Box(Rect(Screen.width/2-100,Screen.height/2-60,200,60), "Error");
		GUI.Label(Rect(Screen.width/2-90,Screen.height/2-50,180,50), multiplayerScript.errorMessage);
		if(GUI.Button(Rect(Screen.width/2+40,Screen.height/2-30,50,20), "Close")){
			multiplayerScript.errorMessage="";
		}
	}	
	
	if(playNowMode){
		playNowFunction();
	}else if(advancedMode){
		
		if(!multiplayerScript.errorMessage || multiplayerScript.errorMessage==""){ //Hide windows on error
			if(GUI.Button(Rect(455,90,140,30), "Back to main menu")){
				currentMenu="";
				advancedMode=false;
			}
			windowRect1 = GUILayout.Window (0, windowRect1, listGUI, "Join a game via the list");	
			windowRect2 = GUILayout.Window (1, windowRect2, directConnectGUIWindow, "Directly join a game via an IP");	
			windowRect3 = GUILayout.Window (2, windowRect3, hostGUI, "Host a game");
		}	
		
	}else{		
		GUI.Box (Rect (90, 180, 260, 105), "Playername");
		GUI.Label (Rect (100, 195, 250, 100), "Please enter your name:");
		
		myPlayerName = GUI.TextField (Rect (178, 215, 147, 27), myPlayerName);	
		if(GUI.changed){
			//Save the name changes
			PlayerPrefs.SetString("playerName", myPlayerName);
		}
		
		if(myPlayerName==""){
			GUI.Label (Rect (100, 240, 260, 100), "After entering your name you can start playing!");
			return;
		}
		
		GUI.Label (Rect (100, 240, 260, 100), "Click on quickplay to start playing right away!");
				
		if(GUI.Button(Rect(400,150,150,30), "Quickplay") ){
			currentMenu="playnow";
			playNowMode=true;
			playNowModeStarted=Time.time;		
		}
		if(GUI.Button(Rect(400,245,150,30), "Advanced") ){
			currentMenu="advanced";
			advancedMode=true;
		}
			
	}
}


function playNowFunction(){
		if(GUI.Button(Rect(490,185,75,20), "Cancel")){
			Network.Disconnect();
			currentMenu="";
			playNowMode=false;
		}
		
		GUI.Box(Rect(Screen.width/4+0,Screen.height/2-50,420,50), "");

		if(multiplayerScript.tryingToConnectPlayNowNumber>=10){
			//If players get fed up waiting they can choose to start a host right away
			if(GUI.Button(Rect(400,185,75,20), "Just host")){
				multiplayerScript.StartHost(multiplayerScript.serverPort);
			}
		}
		
		var connectStatus = multiplayerScript.PlayNow(playNowModeStarted);
		
		if(connectStatus=="failed"){
			//Couldn't find a proper host; host ourselves
			Debug.Log("PlayNow: No games hosted, so hosting one ourselves");	
			multiplayerScript.StartHost(multiplayerScript.serverPort);				
		}else{
			//Still trying to connect to the first hit
			GUI.Label(Rect(Screen.width/4+10,Screen.height/2-45,385,50), connectStatus);
		}
}


function hostGUI(id : int){

	GUILayout.BeginVertical();
	GUILayout.Space(10);
	GUILayout.EndVertical();
	
	GUILayout.BeginHorizontal();
	GUILayout.Space(10);
		GUILayout.Label("Use port: ");
		hostPort = parseInt(GUILayout.TextField(hostPort.ToString(), GUILayout.MaxWidth(75)));
	GUILayout.Space(10);
	GUILayout.EndHorizontal();	
	
	GUILayout.BeginHorizontal();
	GUILayout.Space(10);
		GUILayout.Label("Players: ");
		hostPlayers = parseInt(GUILayout.TextField(hostPlayers.ToString(), GUILayout.MaxWidth(75)));
	GUILayout.Space(10);
	GUILayout.EndHorizontal();
	
	
	GUILayout.BeginHorizontal();
	GUILayout.FlexibleSpace();
		// Start a new server
		if (GUILayout.Button ("Start hosting a server")){
			multiplayerScript.StartHost(hostPort);
		}			
	GUILayout.FlexibleSpace();
	GUILayout.EndHorizontal();
}


function directConnectGUIWindow(id : int){

	GUILayout.BeginVertical();
	GUILayout.Space(5);
	GUILayout.EndVertical();
	GUILayout.Label(multiplayerScript.connectionInfo);
		
	if(multiplayerScript.nowConnecting){
		GUILayout.BeginHorizontal();
		GUILayout.FlexibleSpace();
		GUILayout.Label("Trying to connect to "+connectIP+":"+connectPort);
		GUILayout.FlexibleSpace();
		GUILayout.EndHorizontal();
		
	} else {		

		GUILayout.BeginHorizontal();
		GUILayout.Space(10);
			connectIP = GUILayout.TextField(connectIP, GUILayout.MinWidth(70));
			connectPort = parseInt(GUILayout.TextField(connectPort+""));
		GUILayout.Space(10);
		GUILayout.EndHorizontal();

		GUILayout.BeginHorizontal();
		GUILayout.Space(10);
		GUILayout.FlexibleSpace();
			
		if (GUILayout.Button ("Connect"))
		{
			multiplayerScript.Connect(connectIP, connectPort);
		}	
		
		GUILayout.FlexibleSpace();
		GUILayout.EndHorizontal();
	
	}
	
}

private var scrollPosition : Vector2;

function listGUI (id : int) {
	
		GUILayout.BeginVertical();
		GUILayout.Space(6);
		GUILayout.EndVertical();
	
		
		GUILayout.BeginHorizontal();
		GUILayout.Space(200);

		// Refresh hosts
		if (GUILayout.Button ("Refresh available Servers"))
		{
			multiplayerScript.FetchHostList(true);
		}
		multiplayerScript.FetchHostList(false);
		
		GUILayout.FlexibleSpace();
		GUILayout.EndHorizontal();

		//scrollPosition = GUI.BeginScrollView (Rect (0,60,385,200),	scrollPosition, Rect (0, 100, 350, 3000));
		scrollPosition = GUILayout.BeginScrollView (scrollPosition);

		var aHost : int = 0;
		
		if(multiplayerScript.sortedHostList && multiplayerScript.sortedHostList.length>=1){
			for (var myElement in multiplayerScript.sortedHostList)
			{
				var element=multiplayerScript.hostData[myElement];
				GUILayout.BeginHorizontal();

				// Do not display NAT enabled games if we cannot do NAT punchthrough
				if ( !(multiplayerScript.filterNATHosts && element.useNat) )
				{				
					aHost=1;
					var name = element.gameName + " ";
					GUILayout.Label(name);	
					GUILayout.FlexibleSpace();
					GUILayout.Label(element.connectedPlayers + "/" + element.playerLimit);
					
					if(element.useNat){
						GUILayout.Label(".");
					}
					GUILayout.FlexibleSpace();
					GUILayout.Label("[" + element.ip[0] + ":" + element.port + "]");	
					GUILayout.FlexibleSpace();
					if(!multiplayerScript.nowConnecting){
					if (GUILayout.Button("Connect"))
						{
							multiplayerScript.Connect(element.ip, element.port);
						}
					}else{
						GUILayout.Button("Connecting");
					}
					GUILayout.Space(15);
				}
				GUILayout.EndHorizontal();	
			}
		}		
		GUILayout.EndScrollView ();
		if(aHost==0){
			GUILayout.Label("No games hosted at the moment..");
		}
}
