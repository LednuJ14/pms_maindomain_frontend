import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../../services/api';

const PIPELINE_COLUMNS = [
  { id: 'pending', title: 'New Leads' },
  { id: 'pre_qualified', title: 'Pre-Qualified' },
  { id: 'viewing_scheduled', title: 'Viewing Scheduled' },
  { id: 'application_submitted', title: 'Application' },
  { id: 'background_check', title: 'Background Check' },
  { id: 'approved', title: 'Approved' },
  { id: 'contract_sent', title: 'Contract Sent' }
];

const InquiryPipeline = ({ inquiries, onInquiryUpdate, onInquiryClick }) => {
  const [columns, setColumns] = useState({});

  useEffect(() => {
    const initialColumns = PIPELINE_COLUMNS.reduce((acc, col) => {
      acc[col.id] = {
        ...col,
        items: inquiries.filter(i => 
          i.status === col.id || 
          (col.id === 'pending' && ['read', 'responded'].includes(i.status))
        )
      };
      return acc;
    }, {});
    setColumns(initialColumns);
  }, [inquiries]);

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistically update UI
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    
    const sourceItems = [...sourceColumn.items];
    const destItems = [...destColumn.items];
    
    const [movedItem] = sourceItems.splice(source.index, 1);
    
    // Update status locally
    movedItem.status = destination.droppableId;
    destItems.splice(destination.index, 0, movedItem);

    setColumns({
      ...columns,
      [source.droppableId]: { ...sourceColumn, items: sourceItems },
      [destination.droppableId]: { ...destColumn, items: destItems }
    });

    try {
      // Call API
      const response = await api.put(`/manager/inquiries/${draggableId}/status`, {
        status: destination.droppableId
      });
      if (onInquiryUpdate) {
        onInquiryUpdate(response.data.inquiry);
      }
    } catch (error) {
      console.error('Failed to update inquiry status:', error);
      // Revert on failure (in a real app you'd want to handle this better)
      alert('Failed to update status. Please try again.');
    }
  };

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4 h-full min-h-[600px]">
      <DragDropContext onDragEnd={onDragEnd}>
        {PIPELINE_COLUMNS.map(col => {
          const column = columns[col.id];
          if (!column) return null;
          
          return (
            <div key={col.id} className="min-w-[300px] w-[300px] bg-gray-100 rounded-lg p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700">{col.title}</h3>
                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-sm font-medium">
                  {column.items.length}
                </span>
              </div>
              
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 min-h-[100px] transition-colors rounded-lg ${
                      snapshot.isDraggingOver ? 'bg-gray-200' : ''
                    }`}
                  >
                    {column.items.map((item, index) => (
                      <Draggable key={item.id.toString()} draggableId={item.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onInquiryClick && onInquiryClick(item)}
                            className={`bg-white p-4 rounded-lg shadow-sm mb-3 cursor-pointer border-l-4 ${
                              item.flags?.is_urgent ? 'border-red-500' : 'border-black'
                            } ${snapshot.isDragging ? 'shadow-md ring-2 ring-black ring-opacity-20' : 'hover:shadow-md'} transition-all`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900 truncate pr-2">
                                {item.tenantName || 'Unknown Tenant'}
                              </h4>
                              {item.inquiry?.is_urgent && (
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded flex-shrink-0">
                                  Urgent
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-500 mb-2 truncate">
                              {item.property || 'Unknown Property'}
                              {item.unitName ? ` - ${item.unitName}` : ''}
                            </p>
                            
                            <div className="text-xs text-gray-400 mt-2 flex justify-between">
                              <span>{new Date(item.inquiry?.created_at || Date.now()).toLocaleDateString()}</span>
                              <span className="capitalize">{(item.inquiry_type || item.inquiry?.inquiry_type || 'general').replace('_', ' ')}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>
    </div>
  );
};

export default InquiryPipeline;
