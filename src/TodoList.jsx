// src/TodoList.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './TodoList.css';
import Logo from './Logo/Logo.png';

//MUI imports 
import {
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Default categories configuration
const CATEGORIES = {
  default: { color: '#gray', label: 'No Category' },
  school: { color: '#4CAF50', label: 'School Related' },
  work: { color: '#2196F3', label: 'Work Related' },
  personal: { color: '#FF9800', label: 'Personal' },
  urgent: { color: '#f44336', label: 'Urgent' }
};

const TodoList = () => {
  // State management
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('default');
  const [statistics, setStatistics] = useState({
    totalCompleted: 0,
    unfinishedByCategory: {}
  });
  const [userName, setUserName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newCategory, setNewCategory] = useState({ label: '', color: '#000000' });
  const [customCategories, setCustomCategories] = useState({});

  // Combine default and custom categories
  const combinedCategories = { ...CATEGORIES, ...customCategories };

  // Fetch todos from Firestore
  const fetchTodos = useCallback(async () => {
    const q = query(
      collection(db, 'todos'),
      where('userId', '==', auth.currentUser.uid)
    );
    const querySnapshot = await getDocs(q);
    const todosList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setTodos(todosList);
    calculateStatistics(todosList);
  }, []);

  // Initialize user data and fetch todos
  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    // Extract and format username from email
    const email = auth.currentUser.email;
    const name = email.split('@')[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    setUserName(formattedName);
    fetchTodos();
  }, [fetchTodos, navigate]);

  // Load custom categories for the user
  useEffect(() => {
    const loadCustomCategories = async () => {
      if (!auth.currentUser) return;
      
      const categoriesRef = collection(db, 'users', auth.currentUser.uid, 'categories');
      const snapshot = await getDocs(categoriesRef);
      const categories = {};
      
      snapshot.forEach(doc => {
        categories[doc.id] = doc.data();
      });
      
      setCustomCategories(categories);
    };

    loadCustomCategories();
  }, []);

  // Calculate statistics for todos
  const calculateStatistics = (todos) => {
    const stats = {
      totalCompleted: 0,
      unfinishedByCategory: {}
    };

    todos.forEach(todo => {
      if (todo.completed) {
        stats.totalCompleted++;
      } else {
        stats.unfinishedByCategory[todo.category] = 
          (stats.unfinishedByCategory[todo.category] || 0) + 1;
      }
    });

    setStatistics(stats);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.trim()) {
      await addDoc(collection(db, 'todos'), {
        text: input,
        completed: false,
        userId: auth.currentUser.uid,
        createdAt: new Date(),
        category: selectedCategory,
        color: combinedCategories[selectedCategory]?.color || CATEGORIES.default.color
      });
      setInput('');
      setSelectedCategory('default');
      fetchTodos();
    }
  };

  const deleteTodo = async (id) => {
    await deleteDoc(doc(db, 'todos', id));
    fetchTodos();
  };

  const toggleComplete = async (todo) => {
    try {
      // Pass the 'id' property of the 'todo' object
      await updateDoc(doc(db, 'todos', todo.id), {
        completed: !todo.completed,
      });
      fetchTodos();
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const getSuggestions = (value) => {
    const inputValue = value.trim().toLowerCase();
    if (inputValue.length < 2) return [];
    
    return todos
      .map(todo => todo.text)
      .filter(text => 
        text.toLowerCase().includes(inputValue) && 
        text.toLowerCase() !== inputValue
      )
      .slice(0, 5); // Limit to 5 suggestions
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInput(value);
    setSuggestions(getSuggestions(value));
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current.focus();
  };

  const handleAddCategory = async () => {
    const categoryKey = newCategory.label.toLowerCase().replace(/\s+/g, '_');

    try {
      // Save the new category to Firestore
      const categoryRef = doc(db, 'users', auth.currentUser.uid, 'categories', categoryKey);
      await setDoc(categoryRef, {
        color: newCategory.color,
        label: newCategory.label,
        createdAt: new Date()
      });

      // Update local state
      setCustomCategories(prev => ({
        ...prev,
        [categoryKey]: {
          color: newCategory.color,
          label: newCategory.label
        }
      }));

      // Reset form fields
      setNewCategory({ label: '', color: '#000000' });
      setShowColorPicker(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const Statistics = React.memo(({ statistics, combinedCategories }) => {
    const chartData = useMemo(() => {
    
      return {
        labels: Object.keys(statistics.unfinishedByCategory).map(cat => 
          combinedCategories[cat]?.label || 'Unknown'
        ),
        datasets: [{
          data: Object.values(statistics.unfinishedByCategory),
          backgroundColor: Object.keys(statistics.unfinishedByCategory).map(cat => 
            combinedCategories[cat]?.color || '#000000'
          ),
        }]
      };
    }, [statistics, combinedCategories]);

    const options = useMemo(() => ({
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: (context) => {
              const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `${context.label}: ${context.raw} (${percentage}%)`;
            }
          }
        }
      }
    }), []);

    return (
      <div className="statistics-container">
        <h2>Task Statistics</h2>
        <p className="completed-count">
          Total Tasks Completed: {statistics.totalCompleted}
        </p>
        <div className="chart-container">
          <h3>Unfinished Tasks by Category</h3>
          <Pie data={chartData} options={options} />
        </div>
      </div>
    );
  });

  return (
    <div className="todo-container">
      <div className="header">
        <img src={Logo} alt="Header" className="header-image" />
        <div className="header-overlay">
          <Typography variant="h4" className="header-title">
            {userName}'s Tasks
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleLogout}
            sx={{
              position: 'absolute',
              top: '10px',
              right: '10px',
            }}
          >
            Logout
          </Button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              inputRef={inputRef}
              label="Add a new todo"
              value={input}
              onChange={handleInputChange}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && suggestions.length > 0 && (
              // Render suggestions as a Paper component
              <Paper style={{ position: 'absolute', zIndex: 1 }}>
                {suggestions.map((suggestion, index) => (
                  <MenuItem
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </MenuItem>
                ))}
              </Paper>
            )}
          </Grid>
          <Grid item xs={8} sm={3}>
            <FormControl fullWidth>
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {Object.entries({ ...CATEGORIES, ...customCategories }).map(
                  ([key, { label }]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={4} sm={1}>
            <IconButton
              color="primary"
              onClick={() => setShowColorPicker(true)}
            >
              <AddIcon />
            </IconButton>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
            >
              Add
            </Button>
          </Grid>
        </Grid>
      </form>

      {/* Color Picker Modal (outside the form) */}
      <Dialog open={showColorPicker} onClose={() => setShowColorPicker(false)}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            label="Category Name"
            value={newCategory.label}
            onChange={(e) =>
              setNewCategory((prev) => ({ ...prev, label: e.target.value }))
            }
            required
            fullWidth
          />
          <TextField
            label="Color"
            type="color"
            value={newCategory.color}
            onChange={(e) =>
              setNewCategory((prev) => ({ ...prev, color: e.target.value }))
            }
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddCategory} color="primary">
            Add Category
          </Button>
          <Button onClick={() => setShowColorPicker(false)} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <List>
        {todos.map((todo) => (
          <ListItem
            key={todo.id}
            divider
            secondaryAction={
              <IconButton edge="end" onClick={() => deleteTodo(todo.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <Checkbox
              edge="start"
              checked={todo.completed}
              onChange={() => toggleComplete(todo)}
            />
            <ListItemText
              primary={todo.text}
              secondary={
                combinedCategories[todo.category]?.label || 'No Category'
              }
            />
          </ListItem>
        ))}
      </List>

      <Statistics statistics={statistics} combinedCategories={combinedCategories} />
    </div>
  );
};

export default TodoList;