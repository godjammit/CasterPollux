using UnityEngine;
using System.Collections;
using System.Net;
using System.Net.Sockets;

public enum PreType {
	caster = 1,
	pollux = 2,
	obstacle = 3
}

enum state {
	invalid=0,
	mainmenu=1,
	joinmenu=2,
	hostmenu=3,
	waitserver=4,
	waitclient=5,
	failconnect=6,
	playing=7
}



public class networkController : MonoBehaviour {
	
	private int typetobe;
	
	private string LocalAddress = "127.0.0.1";
	private string ServerAddress = "127.0.0.1";
	private int GameState = (int)state.waitserver;
	private int playerCount = 0;
	private bool LANOnly = true;
	private float nextNetworkUpdateTime = 0.0F;
	private GameObject localPlayerObject; //this needs to become an array
	private Hashtable players = new Hashtable();
	private Vector3 lastLocalPlayerPosition;
	
	public NetworkPlayer localPlayer;
	public GameObject playerPrefab;
	public GameObject polluxPrefab;
	public GameObject casterPrefab;
	public float networkUpdateIntervalMax = 0.05F; // maximum of 10 updates per second
	
	
	void Start () {
		
		LocalAddress = GetLocalIPAddress();
		ServerAddress = LocalAddress;
		Debug.Log("Local IP Address: " + LocalAddress);
		GameState = (int)state.mainmenu;
		
	}
	
	
	void Update () {
		
		// if I am a client, and it's time to send an update
		// and if my position has changed, then send an update
		// to the server
	
		if(Network.isClient && Time.realtimeSinceStartup > nextNetworkUpdateTime)
		{
			//localplayerobject needs to become and array and this needs to parse through each element
			nextNetworkUpdateTime = Time.realtimeSinceStartup + networkUpdateIntervalMax;
			if(localPlayerObject!=null)
			{
				if(lastLocalPlayerPosition != localPlayerObject.transform.position)
				{
					lastLocalPlayerPosition = localPlayerObject.transform.position;
					networkView.RPC("ClientUpdatePlayer",RPCMode.Server,lastLocalPlayerPosition);
				}
			}
		}
	}
	
	public string GetLocalIPAddress()
	{
	   IPHostEntry host;
	   string localIP = "";
	   host = Dns.GetHostEntry(Dns.GetHostName());
	   foreach (IPAddress ip in host.AddressList)
	   {
	     if (ip.AddressFamily == AddressFamily.InterNetwork)
	     {
	       localIP = ip.ToString();
	     }
	   }
	   return localIP;
	}
	
	void ConnectToServer()
	{
    	Network.Connect(ServerAddress, 25000);
		GameState = (int)state.waitserver;
	}
	
	void OnConnectedToServer()
	{
		// wait until we are fully connected
		// to the server before making the 
		// player list request
	
		networkView.RPC("SendAllPlayers", RPCMode.Server);
	}
	
	[RPC]
	void SendAllPlayers(NetworkMessageInfo info)
	{
		if(Network.isServer)
		{
			GameObject[] goPlayers = GameObject.FindGameObjectsWithTag("Player");
			foreach(GameObject gop in goPlayers)
			{
				NetworkPlayer gonp = gop.GetComponent<playerController>().netPlayer;
				NetworkViewID gonvid = gop.GetComponent<NetworkView>().viewID;
				
				int type = (int) gop.GetComponent<playerController>().type;
				
				// only tell the requestor about others
				
				// we make this comparison using the
				// server-assigned index number of the 
				// player instead of the ipAddress because
				// more than one player could be playing
				// under one ipAddress -- ToString()
				// returns this player index number
				
						
				if(gonp.ToString() != info.sender.ToString())
				{
					networkView.RPC("JoinSomething", info.sender, gonvid, gop.transform.position, gonp, type);
				}
	    	}
		}

	}
	
    void OnFailedToConnect(NetworkConnectionError error) 
	{
        Debug.Log("Could not connect to server: " + error);
		GameState = (int)state.failconnect;
    }

	void StartServer()
	{
		bool useNat=false;
		if (LANOnly==true)
			useNat=false;
		else
			useNat=!Network.HavePublicAddress();
		
		Network.InitializeServer(16,25000,useNat);
		
	}
	
	void OnServerInitialized() 
	{
        Debug.Log("Server initialized and ready");
		GameState = (int)state.waitclient;
    }
	
	[RPC]
	void ClientUpdatePlayer(Vector3 pos, NetworkMessageInfo info)
	{
		// a client is sending us a position update
		// normally you would do a lot of bounds checking here
		// but for this simple example, we'll just
		// trust the player (normally wouldn't do this)
		
		
		NetworkPlayer p = info.sender;
		networkView.RPC("ServerUpdatePlayer",RPCMode.Others, p, pos);
	
		// now update it for myself the server
		
		ServerUpdatePlayer(p, pos);
		
	}
	
	[RPC]
	void ServerUpdatePlayer(NetworkPlayer p, Vector3 pos)
	{
		// the server is telling us to update a player
		// again, normally you would do a lot of bounds
		// checking here, but this is just a simple example
			
		if(players.ContainsKey(p))
		{
			GameObject gop = (GameObject)players[p];
			gop.GetComponent<playerController>().target = pos;
		}
		
	}
	
 	void OnPlayerConnected(NetworkPlayer p) 
	{
		if(Network.isServer)
		{
			playerCount++;
			
			// allocate a networkViewID for the new player
			
			NetworkViewID newViewID = Network.AllocateViewID();
			
			// tell sender, others, and server to create the new player
			if (playerCount == 1) 
			{
				networkView.RPC("JoinPollux", RPCMode.All, newViewID, Vector3.zero, p);
			} else {
				networkView.RPC("JoinCaster", RPCMode.All, newViewID, Vector3.zero, p);
			}
				
			Debug.Log("Player " + newViewID.ToString() + " connected from " + p.ipAddress + ":" + p.port);
			Debug.Log("There are now " + playerCount + " players.");
		}
    }
	
	[RPC]
	void JoinSomething(NetworkViewID newPlayerView, Vector3 pos, NetworkPlayer p, int type) 
	{
		switch (type) {
		case (int) PreType.caster:
			playerPrefab = casterPrefab;
			break;
		case (int) PreType.pollux:
			playerPrefab = polluxPrefab;
			break;
		default:
			//playerPrefab = someprefab;
			break;
		}
		typetobe = type;
		JoinPlayer(newPlayerView, pos, p);
	}
	
	[RPC]
	void JoinCaster(NetworkViewID newPlayerView, Vector3 pos, NetworkPlayer p) 
	{
		playerPrefab = casterPrefab;
		typetobe = (int) PreType.caster;
		JoinPlayer(newPlayerView, pos, p);
	}
	
	[RPC]
	void JoinPollux(NetworkViewID newPlayerView, Vector3 pos, NetworkPlayer p) 
	{
		playerPrefab = polluxPrefab;
		typetobe = (int) PreType.pollux;
		JoinPlayer(newPlayerView, pos, p);
	}
	
	[RPC]
	void JoinPlayer(NetworkViewID newPlayerView, Vector3 pos, NetworkPlayer p)
	{
		// instantiate the prefab
		// and set some of its properties
		
		GameObject newPlayer = Instantiate(playerPrefab, pos, Quaternion.identity) as GameObject;
		newPlayer.GetComponent<NetworkView>().viewID = newPlayerView;
		newPlayer.tag = "Player";
		newPlayer.GetComponent<playerController>().type = typetobe;
		
		// set the remote player's target to its current location
		// so that non-moving remote player don't move to the origin
		newPlayer.GetComponent<playerController>().target = pos;
		
		// most importantly, populate the NetworkPlayer
		// structure with the data received from the player
		// this will allow us to ignore updates from ourself
		
		newPlayer.GetComponent<playerController>().netPlayer = p;
		
		// the local GameObject for any player is unknown to
		// the server, so it can only send updates for NetworkPlayer
		// IDs - which we need to translate to a player's local
		// GameObject representation
		
		// to do this, we will add the player to the "players" Hashtable
		// for fast reverse-lookups for player updates
		// Hashtable structure is NetworkPlayer --> GameObject
		
		
		players.Add(p,newPlayer);
		
		if(Network.isClient) 
		{
			if(p.ipAddress==LocalAddress)
			{
				Debug.Log("Server accepted my connection request, I am real player now: " + newPlayerView.ToString());
				
				// because this is the local player, activate the character controller
				
				newPlayer.GetComponent<CharacterController>().enabled = true;
				newPlayer.GetComponent<playerController>().isLocalPlayer = true;
				
				// localplayerobject needs to become an array
				
				localPlayerObject = newPlayer;
				
				camera.transform.parent = localPlayerObject.transform;
				
				// also, now put us into the "playing" GameState
				
				GameState = (int)state.playing;				
			} else {
				
				Debug.Log("Another player connected: " + newPlayerView.ToString());
				
				// because this in not the local player, deactivate the character controller
				
				newPlayer.GetComponent<CharacterController>().enabled = false;
				newPlayer.GetComponent<playerController>().isLocalPlayer = false;
			}
		}
		
	}
	
	
	
	void OnPlayerDisconnected(NetworkPlayer player) 
	{
		if(Network.isServer){
			
			playerCount--;
			
			Debug.Log("Player " + player.ToString() + " disconnected.");
			Debug.Log("There are now " + playerCount + " players.");
			
			// we send this to everyone, including to
			// ourself (the server) to clean-up
			
			networkView.RPC("DisconnectPlayer", RPCMode.All, player);
			
		}
    }
	
	[RPC]
	void DisconnectPlayer(NetworkPlayer player)
	{
		if(Network.isClient) 
		{
			Debug.Log("Player Disconnected: " + player.ToString());
		}
		
		// now we have to do the reverse lookup from
		// the NetworkPlayer --> GameObject
		// this is easy with the Hashtable
		
		if(players.ContainsKey(player))
		{
			// we check to see if the gameobject exists
			// or not first just as a safety measure
			// trying to destory a gameObject that
			// doesn't exist causes a runtime error
			
			if((GameObject)players[player]) {
				Destroy((GameObject)players[player]);
			}
			
			// we also have to remove the Hashtable entry
			
			players.Remove(player);
		}
	}
	
	
	
	// just GUI from here on out
	// nothing too interesting :)
	
 	void OnGUI()
	{
		switch (GameState) 
		{
		case (int)state.mainmenu:
			if(GUILayout.Button("Join Game"))
			{
				GameState = (int)state.joinmenu;
			}
			if(GUILayout.Button("Host Game"))
			{
				GameState = (int)state.hostmenu;
			}
			if(GUILayout.Button("Quit"))
			{
				Application.Quit();
			}
			break;
		case (int)state.joinmenu:
			
			GUILayout.BeginHorizontal();
				GUILayout.Label("Server Address: ");
				ServerAddress = GUILayout.TextField(ServerAddress);
			GUILayout.EndHorizontal();
			
			LANOnly = GUILayout.Toggle(LANOnly, "Local Network Only");
			
			if(GUILayout.Button("Join!"))
			{
				ConnectToServer();
			}
			if(GUILayout.Button("Cancel"))
			{
				GameState = (int)state.mainmenu;
			}
			break;

		case (int)state.hostmenu:
			if(GUILayout.Button("Host!"))
			{
				StartServer();
			}
			if(GUILayout.Button("Cancel"))
			{
				GameState = (int)state.mainmenu;
			}
			break;

		case (int)state.waitserver:
			GUILayout.Label("Connecting...");
			if(GUILayout.Button("Cancel"))
			{
				Network.Disconnect();
				GameState = (int)state.joinmenu;
			}
			break;
			
		case (int)state.failconnect:
			GUILayout.Label("Connection to server failed");
			if(GUILayout.Button("I'll check my firewall, IP Address, Server Address, etc..."))
			{
				GameState = (int)state.joinmenu;
			}
			break;
			
		case (int)state.waitclient:
			GUILayout.Label("SERVER RUNNING");
			GUILayout.Label("waiting for connections...");
			GUILayout.Space(16);
			GUILayout.BeginHorizontal();
				GUILayout.Label("Connected Players: " + playerCount.ToString());
			GUILayout.EndHorizontal();

			if(GUILayout.Button("Kill Server"))
			{
				Network.Disconnect();
				GameState = (int)state.hostmenu;
			}
			break;
			
		case (int)state.playing:
			GUILayout.Label("Playing");
			break;	
		}
	}
	
}