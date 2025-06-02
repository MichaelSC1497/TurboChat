import React from 'react';
import { Text } from '@mantine/core';

const Logo = ({ size = 'lg', ...props }) => {
  return (
    <Text
      fw={700}
      size={size}
      {...props}
    >
      TurboChat
    </Text>
  );
};

export default Logo; 