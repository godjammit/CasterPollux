#pragma strict
#pragma implicit
#pragma downcast

public var gameName = "Example4";
public var serverPort =  35001;

public var hostData : HostData[];

private var natCapable : ConnectionTesterStatus = ConnectionTesterStatus.Undetermined;
public var filterNATHosts = false;
private var probingPublicIP = false;
private var doneTestingNAT = false;
private var timer : float = 0.0;

private var testMessage = "Undetermined NAT capabilities";

private var tryingToConnectPlayNow : boolean = false;
public var tryingToConnectPlayNowNumber : int = 0;

private var remotePort : int[] = new int[3];
private var remoteIP : String[] = new String[3];
public var connectionInfo : String = "";

public var useNAT : boolean;

public var lastMSConnectionAttemptForcedNat : boolean= false;
public var errorMessage : String = "";
private var lastPlayNowConnectionTime : float;

public var nowConnecting : boolean = false;

function Awake ()
{
	sortedHostList = new Array ();
	
	// Start connection test
	natCapable = Network.TestConnection();
		
	// What kind of IP does this machine have? TestConnection also indicates this in the
	// test results
	if (Network.HavePublicAddress()){
		Debug.Log("This machine has a public IP address");
	}else{
		Debug.Log("This machine has a private IP address");
	}	
	
	/* //If you dont want to use the Unity masterserver..
	Network.natFacilitatorIP = myMasterServerIP;
	Network.natFacilitatorPort = 11111;//Change this
	MasterServer.ipAddress = myMasterServerIP;
	MasterServer.port = 22222;//Change this
	Network.connectionTesterIP = myMasterServerIP;
	Network.connectionTesterPort = 33333;//Change this
	*/
	
	
}

function Start(){//must be in start because of coroutine
		
	yield WaitForSeconds(0.5);
	var tries : int=0;
	while(tries<=10){		
		if(hostData && hostData.length>0){
			//Waiting for hostData
		}else{
			FetchHostList(true);
		}
		yield WaitForSeconds(0.5);
		tries++;
	}
}


function OnFailedToConnectToMasterServer(info: NetworkConnectionError)
{
	//Yikes
}

function OnFailedToConnect(info: NetworkConnectionError)
{
	Debug.Log("FailedToConnect info:"+info);
	FailedConnRetry(info);		
}

function Connect(ip : String, port : int){
	// Enable NAT functionality based on what the hosts if configured to do
	//Network.useNat = usenat;
	Debug.Log("Connecting to "+ip+":"+port);
	Network.Connect(ip, port);		
	nowConnecting=true;	
}

//This second definition of Connect can handle the ip string[] passed by the masterserver
function Connect(ip : String[], port : int){
	// Enable NAT functionality based on what the hosts if configured to do
	//Network.useNat = usenat;
	
	Debug.Log("Connecting to "+ip[0]+":"+port);
	Network.Connect(ip, port);		
	nowConnecting=true;	
}

function StartHost(port : int){
	Network.InitializeServer(2, port, useNAT);
}

function OnConnectedToServer(){
	//Stop communication until in the game
	Network.isMessageQueueRunning = false;

	//Save these details so we can use it in the next scene
	PlayerPrefs.SetString("connectIP", Network.connections[0].ipAddress);
	PlayerPrefs.SetInt("connectPort", Network.connections[0].port);
}

function FailedConnRetry(info: NetworkConnectionError){
	if(info == NetworkConnectionError.InvalidPassword){
		mayRetry=false;
	}
	
	
	nowConnecting=false;
	
	//Quickplay
	if(tryingToConnectPlayNow){
		//Try again without NAT if we used NAT
		if(mayRetry && lastMSConnectionAttemptForcedNat){
			Debug.Log("Failed connect 1A: retry without NAT");
		
			remotePort[0]=serverPort;//Fall back to default server port
			Connect(remoteIP, remotePort[0]);
			lastPlayNowConnectionTime=Time.time;
		}else{
			//We didn't use NAT and failed
			Debug.Log("Failed connect 1B: Don't retry");
								
			//Connect to next playnow/quickplay host
			tryingToConnectPlayNowNumber++;
			tryingToConnectPlayNow=false;
		}
	}else{
		//Direct connect or via host list manually
		connectionInfo="Failed to connect!";
		
		if(mayRetry && lastMSConnectionAttemptForcedNat){
			//Since the last connect forced NAT usage,
			// let's try again without NAT.		
			Network.Connect(remoteIP, remotePort[0]);
			nowConnecting=true;
			lastPlayNowConnectionTime=Time.time;
			
		}else{
			Debug.Log("Failed 2b");
		
			if(info == NetworkConnectionError.InvalidPassword){
				errorMessage="Failed to connect: Wrong password supplied";
			}else if(info == NetworkConnectionError.TooManyConnectedPlayers){
				errorMessage="Failed to connect: Server is full";
			}else{
				errorMessage="Failed to connect";
			}
			
			//reset to default port
			remotePort[0]=serverPort;
			
		}
	}	
}

public var CONNECT_TIMEOUT : float = 0.75;
public var CONNECT_NAT_TIMEOUT : float = 5.00;

//Our quickplay function: Go trough the gameslist and try to connect to all games
function PlayNow(timeStarted : float ){
	
		var i : int=0;
		
		for (var myElement in sortedHostList)
		{
			var element=hostData[myElement];
		
			// Do not try NAT enabled games if we cannot do NAT punchthrough
			// Do not try connecting to password protected games
			if ( !(filterNATHosts && element.useNat) && !element.passwordProtected  )
			{
				aHost=1;

				tryingToConnectPlayNow=true;
				tryingToConnectPlayNowNumber=i;
				
				// Enable NAT functionality based on what the hosts if configured to do
				lastMSConnectionAttemptForcedNat=element.useNat;
				//Network.useNat = element.useNat;
				var connectPort : int=element.port;
				Debug.Log("connecting to "+element.gameName+" "+element.ip+":"+connectPort);
				Network.Connect(element.ip, connectPort);	
				lastPlayNowConnectionTime=Time.time;
				i++;		
			}			
		}
		
		//If we reach this point then either we've parsed the whole list OR the list is still empty
		
		//Dont give up yet: Give MS 7 seconds to feed the list
		if(Time.time<timeStarted+7){
			FetchHostList(true);	
			return "Waiting for masterserver..."+Mathf.Ceil((timeStarted+7)-Time.time);	
		}
		
		if(!tryingToConnectPlayNow){
			return "failed";
		}
		
		return "";
}


function Update() {
	// If network test is undetermined, keep running
	if (!doneTestingNAT) {
		TestConnection();
	}
}

function TestConnection() {
        // Start/Poll the connection test, report the results in a label and 
        // react to the results accordingly
        connectionTestResult = Network.TestConnection();
        switch (connectionTestResult) {
            case ConnectionTesterStatus.Error: 
                testMessage = "Problem determining NAT capabilities";
                doneTesting = true;
                break;
                
            case ConnectionTesterStatus.Undetermined: 
                testMessage = "Undetermined NAT capabilities";
                doneTesting = false;
                break;
                            
            case ConnectionTesterStatus.PublicIPIsConnectable:
                testMessage = "Directly connectable public IP address.";
                useNat = false;
                doneTesting = true;
                break;
                
            // This case is a bit special as we now need to check if we can 
            // circumvent the blocking by using NAT punchthrough
            case ConnectionTesterStatus.PublicIPPortBlocked:
                testMessage = "Non-connectable public IP address (port " +
                    serverPort +" blocked), running a server is impossible.";
                useNat = false;
                // If no NAT punchthrough test has been performed on this public 
                // IP, force a test
                if (!probingPublicIP) {
                    connectionTestResult = Network.TestConnectionNAT();
                    probingPublicIP = true;
                    testStatus = "Testing if blocked public IP can be circumvented";
                    timer = Time.time + 10;
                }
                // NAT punchthrough test was performed but we still get blocked
                else if (Time.time > timer) {
                    probingPublicIP = false;         // reset
                    useNat = true;
                    doneTesting = true;
                }
                break;
            case ConnectionTesterStatus.PublicIPNoServerStarted:
                testMessage = "Public IP address but server not initialized, "+
                    "it must be started to check server accessibility. Restart "+
                    "connection test when ready.";
                break;
                            
            case ConnectionTesterStatus.LimitedNATPunchthroughPortRestricted:
                testMessage = "Limited NAT punchthrough capabilities. Cannot "+
                    "connect to all types of NAT servers. Running a server "+
                    "is ill advised as not everyone can connect.";
                useNat = true;
                doneTesting = true;
                break;
                
            case ConnectionTesterStatus.LimitedNATPunchthroughSymmetric:
                testMessage = "Limited NAT punchthrough capabilities. Cannot "+
                    "connect to all types of NAT servers. Running a server "+
                    "is ill advised as not everyone can connect.";
                useNat = true;
                doneTesting = true;
                break;
            
            case ConnectionTesterStatus.NATpunchthroughAddressRestrictedCone:
            case ConnectionTesterStatus.NATpunchthroughFullCone:
                testMessage = "NAT punchthrough capable. Can connect to all "+
                    "servers and receive connections from all clients. Enabling "+
                    "NAT punchthrough functionality.";
                useNat = true;
                doneTesting = true;
                break;
    
            default: 
                testMessage = "Error in test routine, got " + connectionTestResult;
        }
        if (doneTesting) {
            if (useNat)
                shouldEnableNatMessage = "When starting a server the NAT "+
                    "punchthrough feature should be enabled (useNat parameter)";
            else
                shouldEnableNatMessage = "NAT punchthrough not needed";
            testStatus = "Done testing";
        }
}

private var lastHostListRequest : float = 0;

//Request the host limit, but we limit these requests
//Max once every two minutes automatically, max once every 5 seconds when manually requested
function FetchHostList(manual : boolean){
	var timeout : int = 120;
	if(manual){
		timeout=5;
	}
	
	if(lastHostListRequest==0 || Time.realtimeSinceStartup > lastHostListRequest + timeout){
			lastHostListRequest = Time.realtimeSinceStartup;
			MasterServer.RequestHostList (gameName);			
			yield WaitForSeconds(1);//We gotta wait :/			
			hostData = MasterServer.PollHostList();
			yield WaitForSeconds(1);//We gotta wait :/	
			CreateSortedArray();
			Debug.Log("Requested new host list, got: "+hostData.length);
	}
	
	
		
}

//The code below is all about sorting the game list by playeramount

public var sortedHostList : Array;

function CreateSortedArray(){
	
	sortedHostList = new Array();	
	
	var i : int=0;
	var data : HostData[] = hostData;
	for (var element in data)
	{
		AddToArray(i);
		i++;		
	}			
}

function AddToArray(nr : int){
	sortedHostList.Add (nr);	
	SortLastItem();
}

function SortLastItem(){
	if(sortedHostList.length<=1){
		return;
	}
	for(var i=sortedHostList.length-1;i>0;i--){
	var value1 : int= hostData[sortedHostList[i-1]].connectedPlayers;
	var value2 : int = hostData[sortedHostList[i]].connectedPlayers;
		if(value1<value2){
			SwapArrayItem((i-1), i);
		}else{
			//Sorted!
			return;
		}
	}
}

function SwapArrayItem(nr1, nr2){
	var tmp=sortedHostList[nr1];
	sortedHostList[nr1]=sortedHostList[nr2];
	sortedHostList[nr2]=tmp;
}