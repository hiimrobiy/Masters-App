import React, { useEffect, useState } from "react";
import "./../css/PlanningPoker.css";
import axios from "axios";

const PlanningPoker = ({issueData,closeDialog,user,refresh})=>{
 
useEffect(()=>{
  async function fetchPlayers() {
    const response = await axios.get(`http://localhost:5000/sprints/players/${issueData.task_id}/${issueData.issue_id}`,{withCredentials: true});
    setCards(response.data.map((element)=> ({name: element.name,value: Number(user.id) === Number(element.user_id)? element.time :"?",id: element.user_id})));
  }
  fetchPlayers();
},[]);
useEffect(()=>{
  async function notificationIsRead(notification_id){
    try{
      await axios.post(`http://localhost:5000/notifications/read/${notification_id}`,{withCredentials: true});

    }
    catch(error){
      console.log(error);
    }
  }
  if(!issueData.is_read){
  
      notificationIsRead(issueData.notif_id);
  }
},[])
const [inputValue, setInputValue] = useState(""); // For input value
const [showInput, setShowInput] = useState(false); // To toggle the input

  
 
  const [cards, setCards] = useState([]);

  // Handle assigning a value to a card
  const handleCardClick = (playerId) => {
    if(playerId === issueData.user_id) {
      setShowInput(true);
  }
};
const saveValue = async () => {
  if (inputValue.trim() === "") return;

  // Update the card value
  setCards((prevCards) =>
    prevCards.map((card) =>
      card.id === issueData.user_id ? { ...card, value: inputValue } : card
    )
  );
 


  // Reset the input
  setInputValue(inputValue);
  setShowInput(false);
};
const submit = async () => {
  try{
  
    await axios.post(`http://localhost:5000/sprints/players/${issueData.user_id}/${issueData.task_id}/${issueData.issue_id}`,
                    {inputValue:inputValue,repo_id:issueData.repo_id,sprint_id:issueData.sprint_id},
                    {withCredentials:true},);
      console.log(inputValue);
      closeDialog();
      refresh();
  }catch(err){
  console.error("Error saving player time: ", err);
 }
}
const confirm = async () => {
  try{ 
    let avg = cards.reduce((acc,card) =>acc + card.value,0);
    avg = avg/cards.length;
    await axios.post(`http://localhost:5000/sprints/playersConfirm/`,
                    {avg:avg,issue_id:issueData.issue_id,sprint_id:issueData.sprint_id,task_id:issueData.task_id,user_id:issueData.user_id},
                    {withCredentials:true},);
   
      closeDialog();
  }catch(err){
  console.error("Error saving player time: ", err);
 }
}


  return (
    <div className="poker-table">
      <div className="task-section">
        <h2>Current Issue</h2>
        <p>{issueData.title}</p>
      </div>
      <div className="semicircle">
        {cards.map((card) => (
         <div
         key={card.id}
         className={`poker-card ${
          issueData && card.id === issueData.user_id ? "current-user" : "disabled"
         }`}
         onClick={() =>
           issueData &&  !issueData.locked && card.id === issueData.user_id && handleCardClick(card.id, card.value === null ? "5" : null)
         }
       >
            <div className="card-value">{card.value || "?"}</div>
            <div className="player-name">{card.name}</div>
          </div>
        ))}
      </div>
      <div className="action-section">
      {issueData.type ==='TIMESTAMP-COMPLETED' &&
        <button onClick={() => confirm()} 
      >
          Confirm Votes
        </button>
      }
        {issueData.type !=='TIMESTAMP-COMPLETED' &&
        <button onClick={() => submit() }
        disabled ={issueData.locked}>
          Submit Votes
        </button>
      }
        <button className="cancel" onClick={() => alert(JSON.stringify(cards, null, 2))}>
          Cancel
        </button>
      </div>
     
      {showInput && (
      <div className="input-modal">
        <div className="input-container">
          <label htmlFor="cardValue">Enter your estimate:</label>
          <input
            id="cardValue"
            type="number"
            min="1"
            max="100"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button onClick={saveValue}>Save</button>
          <button onClick={() => setShowInput(false)}>Cancel</button>
        </div>
      </div>
    )}
    </div>

  );
};

export default PlanningPoker;
