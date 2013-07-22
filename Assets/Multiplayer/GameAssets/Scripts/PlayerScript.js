var thisName : String = "Bugged name";
var localPlayer : boolean = false;

function OnNetworkInstantiate (msg : NetworkMessageInfo) {
	// This is our own player
	if (networkView.isMine)
	{
		localPlayer=true;
		
		networkView.RPC("setName", RPCMode.Others, thisName);
		
		thisName=PlayerPrefs.GetString("playerName");
	}
	// This is just some remote controlled player, don't execute direct
	// user input on this. DO enable multiplayer controll
	else
	{
		thisName="Remote"+Random.Range(1,10);
		name += thisName;
			
		networkView.RPC("askName", networkView.viewID.owner, Network.player);
		
	
	}
}


@RPC
function setName(name : String){
	thisName=name;
}

@RPC
function askName(asker : NetworkPlayer){
	networkView.RPC("setName", asker, thisName);
}