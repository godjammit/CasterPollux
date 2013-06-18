using UnityEngine;
using System.Collections;

public class follow : MonoBehaviour {
	
	public bool isfollowing = false;
	
	public int modx;
	public int mody;
	public int modz;
	public GameObject followed;
	
	// Use this for initialization
	void Start () {
		
	}
	
	// Update is called once per frame
	void Update () {
		transform.position = new Vector3(
			followed.transform.position.x + modx, 
			followed.transform.position.y + mody, 
			followed.transform.position.z + modz
		);
	}
}
