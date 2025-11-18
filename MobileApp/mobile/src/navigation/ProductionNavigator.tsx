/**
 * Production Stack Navigator
 *
 * Navigation for Production module including:
 * - ProductionListScreen (list)
 * - TaskDetailsScreen
 * - CreateTaskScreen
 * - UpdateTaskStatusScreen
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProductionListScreen from '../screens/Production/ProductionListScreen';
import TaskDetailsScreen from '../screens/Production/TaskDetailsScreen';
import CreateTaskScreen from '../screens/Production/CreateTaskScreen';
import { COLORS } from '../config';

export type ProductionStackParamList = {
  ProductionList: undefined;
  TaskDetails: { taskId: string };
  CreateTask: undefined;
  EditTask: { taskId: string };
  UpdateTaskStatus: { taskId: string };
};

const Stack = createStackNavigator<ProductionStackParamList>();

export default function ProductionNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="ProductionList"
        component={ProductionListScreen}
        options={{
          title: 'Produksi',
          headerShown: false, // Hidden because it's in tab navigator
        }}
      />
      <Stack.Screen
        name="TaskDetails"
        component={TaskDetailsScreen}
        options={{
          title: 'Detail Tugas',
        }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{
          title: 'Buat Tugas Baru',
        }}
      />
      <Stack.Screen
        name="EditTask"
        component={CreateTaskScreen}
        options={{
          title: 'Edit Tugas',
        }}
      />
    </Stack.Navigator>
  );
}
