var playerPref : Transform;
var clientPref : Transform;
var gameName : String = "C&P";
var playerName : String = "";

//Server-only playerlist
public var playerList = new ArrayList();
class FPSPlayerNode {
	var playerName : String;
	var networkPlayer : NetworkPlayer;
}


function Awake() 
{
	playerName = PlayerPrefs.GetString("playerName");
	
	Network.isMessageQueueRunning = true;
	//Screen.lockCursor=true;	
	
	if(Network.isServer){
				
		networkView.RPC ("TellOurName", RPCMode.AllBuffered, playerName);
		
		for (var go : GameObject in FindObjectsOfType(GameObject)){
			go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);	
		}		
		MasterServer.RegisterHost(gameName, PlayerPrefs.GetString("playerName")+"'s game");
			
	}else if(Network.isClient){
		
		networkView.RPC ("TellOurName", RPCMode.AllBuffered, playerName);
		
		for (var go : GameObject in FindObjectsOfType(GameObject)){
			go.SendMessage("OnNetworkLoadedLevel", SendMessageOptions.DontRequireReceiver);	
		}	
		
		
		
	}else{
		//How did we even get here without connection?
		//Screen.lockCursor=false;	
		Application.LoadLevel(0);		
	}
}


//Server function
function OnPlayerDisconnected(player: NetworkPlayer) {
	Network.RemoveRPCs(player, 0);
	Network.DestroyPlayerObjects(player);
	
	//Remove player from the server list
	for(var entry : FPSPlayerNode in  playerList){
		if(entry.networkPlayer==player){
			playerList.Remove(entry);
			break;
		}
	}
}

//Server function
function OnPlayerConnected(player: NetworkPlayer) {
}

@RPC
//Sent by newly connected clients, recieved by server
function TellOurName(name : String, info : NetworkMessageInfo){
	var netPlayer : NetworkPlayer = info.sender;
	if(netPlayer+""=="-1"){
		//This hack is required to fix the local players networkplayer when the RPC is sent to itself.
		netPlayer=Network.player;
	}
	
	var newEntry : FPSPlayerNode = new FPSPlayerNode();
	newEntry.playerName=name;
	newEntry.networkPlayer=netPlayer;
	playerList.Add(newEntry);
}

//Called via Awake()
function OnNetworkLoadedLevel()
{
	var newTrans : Transform;
	if (Network.isClient)
		newTrans = Network.Instantiate(clientPref, transform.position, transform.rotation, 0); 
	if (Network.isServer)
		newTrans = Network.Instantiate(playerPref, transform.position, transform.rotation, 0); 
}


function OnDisconnectedFromServer () {
	//Load main menu
	//Screen.lockCursor=false;
	Application.LoadLevel((0));
}




