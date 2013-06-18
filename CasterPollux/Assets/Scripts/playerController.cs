using UnityEngine;
using System.Collections;

public class playerController : MonoBehaviour {
	
	public NetworkPlayer netPlayer;
	public bool isLocalPlayer = false;
    public float speed = 6.0F;
    public float jumpSpeed = 8.0F;
    public float gravity = 20.0F;
	public Vector3 target = Vector3.zero;
	public Material[] materials;
	public float movePrecision = 0F;
    private Vector3 moveDirection = Vector3.zero;
	
	public int type;
	
    void Update() {
		
		if(isLocalPlayer){
			
			// move code call here
			
			moveObject();
			
		
		} else {
			
			// move toward target
			
			// need to be-rid of the .magnitude by using a sphere collision.
			
			if((transform.position - target).magnitude > movePrecision)
			{
				transform.LookAt(target);
				transform.Translate(Vector3.forward * Time.deltaTime * speed);
			}
			
		}

	
	}
	
	void moveObject() 
	{
		CharacterController controller = GetComponent<CharacterController>();
        if (controller.isGrounded) 
		{
            moveDirection = new Vector3(Input.GetAxis("Horizontal"), 0, 0);
            moveDirection = transform.TransformDirection(moveDirection);
            moveDirection *= speed;
            if (Input.GetButton("Jump"))
                moveDirection.y = jumpSpeed;
            
        }
        moveDirection.y -= gravity * Time.deltaTime;
        controller.Move(moveDirection * Time.deltaTime);
	}
}