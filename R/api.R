library(optiSel)
library(nprcgenekeepr)
library(digest)
library(rjson)
library(dplyr)

# Load environment variables for configuration into global namespace
api_base   <- Sys.getenv("API_BASE", "http://localhost:8080/api/")
auth_header <- Sys.getenv("API_AUTH", "")

#' Return any custom headers to use for API requests
#'
#' @return A vector with header values, header names are set as names.
#' 
our_headers <- function() {
  tmp <- unlist(strsplit(auth_header, ":"))

  if (length(tmp) == 1) {
    name <- 'Authorization'
  } else {
    name <-tmp[1]
    tmp <- tmp[2:length(tmp)]
  }

  ret <- c(tmp[1])
  names(ret) <- c(name)
  return (ret)
}

#' Helper function to get a specific resource. Does request and json decoding
#'
#' @param resource The resource to get, will be appended to api_base.
#' @return The deserialized JSON (as a list)
get_resource <- function(resource) {
  print(paste0("Fetching resource ", resource))
  c <-url( paste0(api_base,resource), headers = our_headers())

  res <-fromJSON(paste(readLines(c), collapse=""))
  close(c)
  return (res)
}

#Return the digest of the current individuals in the corresponding genebank 
get_modifications_digest <- function(genebank_id){
  #' Get digest of the current individuals in a given genebank
  #'
  #' @description This function calculate the digest of all the individual numbers of the given genebank.
  #'
  #' @param genebank_id The Genebank ID to get the individual number list from.
  #' @details If the digest changes we know we need to recalculate

  individuals <- get_resource(paste0("genebank/",genebank_id,"/individuals"))
  return (digest(individuals))
}

#' Returns a pedigree for the specified genebank_id
#'
#' @param genebank_id - the genenbank to return pedigree for
#'
#' @return the pedigree for the specified genebank
get_rabbits<-function(genebank_id){
  rabbits <- get_all_individuals(genebank_id)

  if (is.null(rabbits) || (length(rabbits) == 0)) {
     return(NULL)
  }
  
   print("Calling optisel")

   Pedi <- optiSel::prePed(rabbits)
   print("Return from optisel")

   return(Pedi)
}


#' Get individuals for genebank_id in a format suitable for optisel
#'
#' @param genebank_id - the genebank to return rabbits for
#' @return A dataframe suitable for feeding to 
get_all_individuals <- function(genebank_id) {
  js <- get_resource(paste0("genebank/",genebank_id,"/individuals"))
  
  tmp<-do.call('rbind', 
        lapply(js$individuals, 
               function(x) { 
                 unlist(x)[c('number','father.number', 'mother.number','sex', 'birth_date','active')]
               }
          )
    )
   #Force columnames fix for mellerud data where first ind does not have father or mother. 
   colnames(tmp)<-c('number','father.number', 'mother.number','sex', 'birth_date','active')
   if (length(tmp) == 0) {
   return(NULL)
  }

  df <- rename(
    mutate(
      mutate(data.frame(tmp),
  	     Born = as.numeric(substr(birth_date, 1, 4)),
	     .after=4),
	   birth_date = NULL),
    Indiv=number, Sire=father.number, Dam=mother.number, Sex=sex, is_active = active)

  names(df)<-c("Indiv","Sire","Dam","Sex", "Born", "is_active")
  return (df)
}


#' Function to preload data on startup
update_preload_all_data <- function() {
  print("Getting available genebanks")
  js <- get_resource("genebanks")

  genebanks <<- c()
  for(i in (js[1][[1]])){
    assign(paste0("MOD_",i$id),get_modifications_digest(i$id),envir = .GlobalEnv)
    update_data(i$id)
    genebanks <<- append(genebanks, i$id)
  }
}


#' Update and calculate the Kinship matrix and inbreeding
update_data <- function(genebank_id) {
  Pedi<-get_rabbits(genebank_id)
  if (is.null(Pedi)) {
      return (NULL)
  }
  #Save Pedi to reduce amount of request to db
  assign(paste0("PEDI_",genebank_id), Pedi, envir = .GlobalEnv)
  #Calculate Inbreeding and name it after genebank_id
  assign(paste0("IDB_",genebank_id),data.frame(number=Pedi[,1], Inbr=pedigree::calcInbreeding(Pedi[,1:3]), stringsAsFactors = FALSE),envir = .GlobalEnv)
  #Get current active population
  keep<-Pedi[Pedi$is_active == "TRUE",]$Indiv
  #Calculate Kinship of current population and return Kinship matrix and Meankinship
  assign(paste0("KIN_",genebank_id),optiSel::pedIBD(Pedi,keep.only=keep),envir = .GlobalEnv)
  assign(paste0("MK_",genebank_id),colMeans(get(paste0("KIN_",genebank_id))),envir = .GlobalEnv)
}

#* @serializer csv
#* @get /kinship/<genebank_id:int>
calculate_kinship <- function(genebank_id, update_data="FALSE") {

  summary(genebanks)
  
  if(!(genebank_id %in% genebanks)){stop("must be a valid genebank_id")}
  if(update_data){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
   }
  return(as.data.frame(get(paste0("KIN_",genebank_id))))
}

#' For Future use
#' Calculates founder Equivalents
#'
#' @return The founder equivalents \code{FE = 1 / sum(p ^ 2)}, where \code{p}
#' is average number of descendants and \code{r} is the mean number of founder
#' alleles retained in the gene dropping experiment.
calculateFEFG <- function() {
  Pedi<-get_rabbits(genebank_id)

  if (is.null(Pedi)) {
     return
  }

  ped<- data.frame(
    id = Pedi$Indiv,
    sire = Pedi$Sire,
    dam = Pedi$Dam,
    stringsAsFactors = TRUE)
  ped["gen"] <- findGeneration(ped$id, ped$sire, ped$dam)
  ped$population <- getGVPopulation(ped, keep)
  fe <- calcFE(ped)
  allelesFactors <- geneDrop(ped$id, ped$sire, ped$dam, ped$gen,, genotype = NULL, n = 5000, updateProgress = NULL)
}


#' Update and reload the data structures from the sql server
#* @get /update-db/
update_data_cron <- function() {
  for(i in genebanks){
    MOD_change<-get_modifications_digest(i)
    if(get(paste0("MOD_",i))!= MOD_change)
    {
      assign(paste0("MOD_",i),MOD_change,envir = .GlobalEnv)
      update_data(i)
      print(paste0("Updated genebank id: ",i))
    }
  }
}

#' Return the inbreeding
#'
#' @param genebank_id - the genebank to get the inbreeding for
#' @return - the inbreeding coefficents
#' 
#* @serializer csv
#* @get /inbreeding/<genebank_id:int>
inbreeding <- function(genebank_id,update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks)){stop("must be a valid genebank_id")}
  if(update_from_db ){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      print(paste("Refreshing data for genebank", genebank_id))
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
  }
  return (get(paste0("IDB_",genebank_id)))
}


#' Return the mean kinship coeffecient
#
#' @param genebank to return MK for
#' @return mean kinship coefficient
#' 
#* @serializer csv
#* @get /meankinship/<genebank_id:int>
meankinship <- function(genebank_id,update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks)){stop("must be a valid genebank_id")}
  if(update_from_db ){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
  }
  return(
    data.frame(number=names(get(paste0("MK_",genebank_id))), MK=get(paste0("MK_",genebank_id)), row.names=NULL)
  )
}

#* @post /testbreed/
testbreed <- function(req, update_data="FALSE"){
  if(update_data){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
  }
  body <- req$argsBody
  Pedi <- get(paste0("PEDI_",body$genebankId))
  if (is.null(Pedi)) {
      return (NULL)
  }

  if(!"female" %in% names(body)) {
    mother_id <- paste(body$femaleGF, '+', body$femaleGM)
    unregistered_female <- c(mother_id, body$femaleGF, body$femaleGM, NaN, NaN, NaN, TRUE, TRUE)
    Pedi <- rbind(Pedi, unregistered_female)
  } else {
    mother_id <- body$female
  }
  if(!"male" %in% names(body)) {
    father_id <- paste(body$maleGF, '+', body$maleGM)
    unregistered_male <- c(father_id, body$maleGF, body$maleGM, NaN, NaN, NaN, TRUE, TRUE)
    Pedi <- rbind(Pedi, unregistered_male)
  } else {
    father_id <- body$male
  }

  offspring_id <- paste(father_id, '+', mother_id)
  potentialOffspring <- c(offspring_id, father_id, mother_id, NaN, NaN, NaN, TRUE, TRUE)
  Pedi <- rbind(Pedi, potentialOffspring)
  inbreed_calculation <- data.frame(number=Pedi[,1], Inbr=pedigree::calcInbreeding(Pedi[,1:3]), stringsAsFactors = FALSE)
  calculated_coi <- inbreed_calculation[inbreed_calculation$number == offspring_id,2]

  return(list(calculated_coi=calculated_coi))
}

#RUN stuff and preload
update_preload_all_data()
