const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";


class StoryList {
  constructor(stories) {
    this.stories = stories;
  }


  static async getStories() {
    // query the /stories endpoint (no auth required)
    const response = await axios.get(`${BASE_URL}/stories`);

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    const storyList = new StoryList(stories);
    return storyList;
  }



  async addStory(user, newStory) {
    const response = await axios({
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: {
        // request body
        // this is the format specified by the API
        token: user.loginToken,
        story: newStory,
      }
    });

    // make a Story instance out of the story object we get back
    newStory = new Story(response.data.story);
    // add the story to the beginning of the list
    this.stories.unshift(newStory);
    // add the story to the beginning of the user's list
    user.ownStories.unshift(newStory);

    return newStory;
  }



  async removeStory(user, storyId) {
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: {
        token: user.loginToken
      },
    });

    // filter out the story whose ID we are removing
    this.stories = this.stories.filter(story => story.storyId !== storyId);

    // do the same thing for the user's list of stories
    user.ownStories = user.ownStories.filter(s => s.storyId !== storyId
    );
  }
}



class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  /* Create and return a new user.

   */

  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name,
      }
    });

    // build a new User instance from the API response
    const newUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    newUser.loginToken = response.data.token;

    return newUser;
  }


  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password,
      }
    });

    // build a new User instance from the API response
    const existingUser = new User(response.data.user);

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = response.data.token;

    return existingUser;
  }



  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {token}
    });

    // instantiate the user from the API information
    const existingUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));

    return existingUser;
  }


  async retrieveDetails() {
    const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
      params: {
        token: this.loginToken
      }
    });

    // update all of the user's properties from the API response
    this.name = response.data.user.name;
    this.createdAt = response.data.user.createdAt;
    this.updatedAt = response.data.user.updatedAt;

    // remember to convert the user's favorites and ownStories into instances of Story
    this.favorites = response.data.user.favorites.map(s => new Story(s));
    this.ownStories = response.data.user.stories.map(s => new Story(s));

    return this;
  }

  /**
   * Add a story to the list of user favorites and update the API
   * - storyId: an ID of a story to add to favorites
   */

  addFavorite(storyId) {
    return this._toggleFavorite(storyId, "POST");
  }

  /**
   * Remove a story to the list of user favorites and update the API
   * - storyId: an ID of a story to remove from favorites
   */

  removeFavorite(storyId) {
    return this._toggleFavorite(storyId, "DELETE");
  }


  async _toggleFavorite(storyId, httpVerb) {
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      method: httpVerb,
      data: {
        token: this.loginToken
      }
    });

    await this.retrieveDetails();
    return this;
  }

  /**
   * Send a PATCH request to the API in order to update the user
   * - userData: the user properties you want to update
   */

  async update(userData) {
    const response = await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: "PATCH",
      data: {
        user: userData,
        token: this.loginToken
      }
    });

    // "name" is really the only property you can update
    this.name = response.data.user.name;

    // Note: you can also update "password" but we're not storing it
    return this;
  }

  /**
   * Send a DELETE request to the API in order to remove the user
   */

  async remove() {
    // this function is really just a wrapper around axios
    await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: "DELETE",
      data: {
        token: this.loginToken
      }
    });
  }
}



class Story {



  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }


  async update(user, storyData) {
    const response = await axios({
      url: `${BASE_URL}/stories/${this.storyId}`,
      method: "PATCH",
      data: {
        token: user.loginToken,
        story: storyData
      }
    });

    const { author, title, url, updatedAt } = response.data.story;

    this.author = author;
    this.title = title;
    this.url = url;
    this.updatedAt = updatedAt;

    return this;
  }
}