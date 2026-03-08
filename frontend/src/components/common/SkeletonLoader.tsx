import React from 'react';

interface SkeletonProps {
    type?: 'text' | 'card' | 'avatar' | 'title' | 'button';
    className?: string;
}

const SkeletonLoader: React.FC<SkeletonProps> = ({ type = 'text', className = '' }) => {
    const baseClass = "animate-pulse bg-gray-200 rounded-xl";

    const getStyles = () => {
        switch (type) {
            case 'avatar':
                return "w-12 h-12 rounded-full";
            case 'title':
                return "h-8 w-3/4 mb-4";
            case 'text':
                return "h-4 w-full mb-2";
            case 'button':
                return "h-12 w-32 rounded-xl";
            case 'card':
                return "h-64 w-full rounded-2xl";
            default:
                return "h-4 w-full";
        }
    };

    return <div className={`${baseClass} ${getStyles()} ${className}`}></div>;
};

export const ServiceCardSkeleton = () => (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col h-full">
        <SkeletonLoader type="card" className="h-48 mb-4" />
        <SkeletonLoader type="title" />
        <SkeletonLoader type="text" className="w-full" />
        <SkeletonLoader type="text" className="w-5/6" />
        <div className="mt-auto pt-4 flex items-center justify-between">
            <SkeletonLoader type="button" className="h-10 w-24" />
            <SkeletonLoader type="avatar" className="w-8 h-8" />
        </div>
    </div>
);

export const DashboardStatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl shadow-sm p-6">
                <div className="flex justify-between mb-4">
                    <SkeletonLoader type="avatar" />
                    <SkeletonLoader type="text" className="w-16 h-6 rounded-full" />
                </div>
                <SkeletonLoader type="title" className="h-10 w-24 mb-2" />
                <SkeletonLoader type="text" className="w-32" />
            </div>
        ))}
    </div>
);

export default SkeletonLoader;
