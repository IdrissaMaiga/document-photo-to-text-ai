// Sample TypeScript file for testing code extraction
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];

  constructor() {
    this.initializeUsers();
  }

  private initializeUsers(): void {
    this.users = [
      { id: 1, name: "John Doe", email: "john@example.com" },
      { id: 2, name: "Jane Smith", email: "jane@example.com" }
    ];
  }

  public getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  public getAllUsers(): User[] {
    return [...this.users];
  }

  public addUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      id: this.users.length + 1,
      ...user
    };
    this.users.push(newUser);
    return newUser;
  }
}

// Export the class
export default UserService;

// Usage example
const userService = new UserService();
const user = userService.getUserById(1);
console.log(user);