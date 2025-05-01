import React, { memo } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { Paper, Box, Typography, Tooltip } from '@mui/material';

export interface AzureResourceNodeData {
  label: string;
  filename: string;
  provider: string;
  category: string;
  displayName: string;
  url?: string;
}

const AzureResourceNode = ({ data, selected }: NodeProps<AzureResourceNodeData>) => {
  const iconUrl = data.url || `/cloudicons/${data.provider}/${data.category}/${data.filename}`;

  return (
    <Paper
      elevation={selected ? 3 : 1}
      sx={{
        borderRadius: 1,
        border: selected ? '2px solid #2196f3' : '1px solid #e0e0e0',
        padding: 0.5,
        minWidth: 120,
        maxWidth: 150,
        backgroundColor: 'background.paper',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#555', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#555', width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ background: '#555', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#555', width: 8, height: 8 }}
      />
      
      <Tooltip title={data.displayName} arrow>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            py: 0.5,
          }}
        >
          <Box
            sx={{
              width: 50,
              height: 50,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 0.5,
            }}
          >
            <img
              src={iconUrl}
              alt={data.displayName}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                // Fallback to a default icon if the image fails to load
                const imgElement = e.target as HTMLImageElement;
                imgElement.src = '/assets/default-resource.svg';
              }}
            />
          </Box>
          <Typography
            variant="caption"
            noWrap
            sx={{
              width: '100%',
              fontSize: '10px',
              lineHeight: '12px',
              fontWeight: selected ? 'bold' : 'normal',
            }}
          >
            {data.displayName}
          </Typography>
        </Box>
      </Tooltip>
    </Paper>
  );
};

export default memo(AzureResourceNode); 