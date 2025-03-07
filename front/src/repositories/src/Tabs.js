import React, { useRef } from 'react';
import './../css/Tabs.css';

const Tabs = ({ repositories, activeTab, onTabChange, onOpenDialog, isRepoPage }) => {
  const tabsContainerRef = useRef();

  const scrollTabs = (direction) => {
    if (tabsContainerRef.current) {
      const scrollAmount = 150; // Adjust scroll amount
      tabsContainerRef.current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="tabs-wrapper">
        <div className='scroll-button-div'>
        <button
        className="scroll-button left"
          onClick={() => scrollTabs('left')}
          aria-label="Scroll left"
        >
          ◀
        </button>
      </div>

      <div className="tabs-container" ref={tabsContainerRef}>
        {repositories.map((repo, index) => (
          <div
            key={repo.id}
            className={`tab ${index === activeTab ? 'active-tab' : ''}`}
            onClick={() => onTabChange(index)}
          >
            {repo.name}
          </div>
        ))}
      
      </div>
      <div className='scroll-button-div' >
      <button
        className="scroll-button right"
        onClick={() => scrollTabs('right')}
        aria-label="Scroll right"
      >
        ▶
      </button>
    </div>
    </div>
  );
};

export default Tabs;
