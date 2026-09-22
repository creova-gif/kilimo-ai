import React from 'react';
import { TextField, type TextFieldProps } from '../ui';
import { formatDateInput } from '../../lib/recordsCommon';

export interface DateFieldProps
  extends Omit<TextFieldProps, 'keyboardType' | 'maxLength' | 'onChangeText' | 'value'> {
  value: string;
  onChangeText: (text: string) => void;
}

/** Date entry as YYYY-MM-DD: numeric keypad, hyphens inserted as the user types. */
export function DateField({ value, onChangeText, ...rest }: DateFieldProps) {
  return (
    <TextField
      value={value}
      onChangeText={(text) => onChangeText(formatDateInput(text))}
      keyboardType="number-pad"
      maxLength={10}
      placeholder="YYYY-MM-DD"
      autoCorrect={false}
      {...rest}
    />
  );
}
