import type { QuestionBankEntry } from '@placecampus/shared-types';

/**
 * Built-in starter questions faculty can pick from in the interview room or
 * when scheduling. Faculty can always add their own questions as well.
 */
export const QUESTION_BANK: readonly QuestionBankEntry[] = [
  // DSA
  { category: 'DSA', text: 'Find the length of the longest substring without repeating characters.' },
  { category: 'DSA', text: 'Given an array of integers, return the indices of two numbers that add up to a target.' },
  { category: 'DSA', text: 'Detect whether a linked list has a cycle, and find where the cycle begins.' },
  { category: 'DSA', text: 'Merge overlapping intervals in a list of intervals.' },
  // Data Structures
  { category: 'Data Structures', text: 'When would you choose a hash map over a balanced binary search tree?' },
  { category: 'Data Structures', text: 'Explain how a min-heap works and how insertion keeps the heap property.' },
  { category: 'Data Structures', text: 'Implement a queue using two stacks. What is the amortised cost of each operation?' },
  { category: 'Data Structures', text: 'What is a trie, and what problems is it well suited for?' },
  // Algorithms
  { category: 'Algorithms', text: 'Explain the difference between BFS and DFS and when you would use each.' },
  { category: 'Algorithms', text: 'Walk through how merge sort works and analyse its time and space complexity.' },
  { category: 'Algorithms', text: 'What is dynamic programming? Solve the coin change problem using it.' },
  { category: 'Algorithms', text: 'How does Dijkstra’s algorithm work, and why does it fail with negative edges?' },
  // DBMS
  { category: 'DBMS', text: 'Explain the ACID properties of a transaction.' },
  { category: 'DBMS', text: 'What is normalisation? Describe 1NF, 2NF and 3NF with an example.' },
  { category: 'DBMS', text: 'What is the difference between an inner join and a left outer join?' },
  { category: 'DBMS', text: 'How do indexes speed up queries, and what do they cost?' },
  // Operating Systems
  { category: 'Operating Systems', text: 'What is the difference between a process and a thread?' },
  { category: 'Operating Systems', text: 'Explain deadlock and the four conditions required for it.' },
  { category: 'Operating Systems', text: 'How does virtual memory work, and what is a page fault?' },
  { category: 'Operating Systems', text: 'Compare round-robin and priority CPU scheduling.' },
  // Computer Networks
  { category: 'Computer Networks', text: 'What happens when you type a URL into the browser and press Enter?' },
  { category: 'Computer Networks', text: 'Compare TCP and UDP. When would you prefer UDP?' },
  { category: 'Computer Networks', text: 'Explain the TCP three-way handshake.' },
  { category: 'Computer Networks', text: 'What is DNS and how does name resolution work?' },
  // OOP
  { category: 'OOP', text: 'Explain the four pillars of object-oriented programming with examples.' },
  { category: 'OOP', text: 'What is the difference between an abstract class and an interface?' },
  { category: 'OOP', text: 'Explain method overloading versus method overriding.' },
  { category: 'OOP', text: 'Which SOLID principle do you find most useful, and why?' },
  // Java
  { category: 'Java', text: 'Explain the difference between ==, equals() and hashCode() in Java.' },
  { category: 'Java', text: 'How does garbage collection work in the JVM?' },
  { category: 'Java', text: 'What is the difference between ArrayList and LinkedList?' },
  { category: 'Java', text: 'Explain checked and unchecked exceptions.' },
  // React
  { category: 'React', text: 'How does the virtual DOM and reconciliation work in React?' },
  { category: 'React', text: 'When does useEffect run, and how do you clean up an effect?' },
  { category: 'React', text: 'How would you avoid unnecessary re-renders in a large component tree?' },
  { category: 'React', text: 'Compare lifting state up, context, and an external state library.' },
  // Node.js
  { category: 'Node.js', text: 'Explain the Node.js event loop and its phases.' },
  { category: 'Node.js', text: 'How do streams work in Node.js, and when are they useful?' },
  { category: 'Node.js', text: 'How do you handle errors in async/await code in an Express app?' },
  { category: 'Node.js', text: 'What is middleware in Express? Give an example you have written.' },
  // Projects
  { category: 'Projects', text: 'Walk me through the architecture of your strongest project.' },
  { category: 'Projects', text: 'What was the hardest bug you fixed in a project, and how did you find it?' },
  { category: 'Projects', text: 'If you rebuilt your project today, what would you change and why?' },
  { category: 'Projects', text: 'How did you test your project, and how would you scale it?' },
  // HR and Behavioral
  { category: 'HR and Behavioral', text: 'Tell me about yourself.' },
  { category: 'HR and Behavioral', text: 'Describe a time you disagreed with a teammate. How did you resolve it?' },
  { category: 'HR and Behavioral', text: 'What are your strengths and an area you are working to improve?' },
  { category: 'HR and Behavioral', text: 'Where do you see yourself in three years?' },
];
