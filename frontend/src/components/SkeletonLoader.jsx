import React from 'react';

const SkeletonLoader = () => {
  return (
    <div className="skeleton-container" style={{ paddingBottom: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Top Balance Skeleton */}
      <div className="skeleton skeleton-card" style={{ height: '180px', marginBottom: '24px', borderRadius: '24px' }}></div>
      
      {/* List Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
        <div className="skeleton skeleton-text" style={{ width: '40%', height: '24px', borderRadius: '6px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '20%', height: '24px', borderRadius: '6px' }}></div>
      </div>
      
      {/* List items Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="skeleton skeleton-list-item" style={{ height: '70px', borderRadius: '16px' }}></div>
        <div className="skeleton skeleton-list-item" style={{ height: '70px', borderRadius: '16px' }}></div>
        <div className="skeleton skeleton-list-item" style={{ height: '70px', borderRadius: '16px' }}></div>
        <div className="skeleton skeleton-list-item" style={{ height: '70px', borderRadius: '16px' }}></div>
        <div className="skeleton skeleton-list-item" style={{ height: '70px', borderRadius: '16px' }}></div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
