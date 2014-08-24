## if the matrix is already inversed, then it will take th prevuosu values, but if the matrix is not calculated, then it will calculate

## assign the the value to the matrix adn the invesre

makeCacheMatrix <- function(x = matrix()) 
{
  
  s <- NULL  
  set <- function(y) 
  {
    x <<- y
    s <<- NULL
  }
  get <- function() 
  {
    x
  }
  setsolve <- function(inverse) 
  {
    s <<- inverse
  }
  getsolve <- function() 
  {
    s
  }  
  list(set = set, get = get,setsolve = setsolve,getsolve = getsolve)
}


## inverse the matrix

cacheSolve <- function(x) 
{
        ## Return a matrix that is the inverse of 'x'
  
  s <- x$getsolve()
  
  if(!is.null(s)) 
    {
      message("getting cached data")
      return(s)
    }
  data <- x$get()
  s <- solve(data)
  x$setsolve(s)
  s
}
